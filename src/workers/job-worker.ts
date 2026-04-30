import { createJobWorker, createMessageWorker, QUEUE_NAME, MESSAGE_QUEUE_NAME, type JobName, type SendMessageJobData } from "@/libs/queue"
import { getMessagingService } from "@/libs/integrations"
import { prisma } from "@/libs/db"
import { runHealthSurveyDispatcher, checkHealthSurveyDispatchAdherence, runHealthSurveyAutoDispatchScheduler } from "@/modules/health-surveys/health-survey-dispatch.service"
import { detectLowScoreAlerts, detectScoreDropAlerts, detectNegativeTrendAlerts, detectConsentExpiredAlerts } from "@/modules/alerts/alert.service"
import { unpauseAllTenantsDueEmployees } from "@/modules/employees/employee.service"
import { sendPgrReviewReminders } from "@/modules/pgr/pgr.service"
import { retryFailedWebhookEvents } from "@/modules/billing/webhook.handler"
import { createMessageLog } from "@/modules/messaging/message-log.repository"
import { deleteAllTenantsExpiredHealthSurveyTokens } from "@/modules/health-surveys/health-survey.repository"
import { jobLogService } from "@/modules/job-logs/job-log.service"
import { runActionPlanSuggestionGenerator } from "@/modules/action-plans/action-plan-suggestion.service"
import { runOrganizationDeletionExecutor } from "@/modules/organizations/account-deletion.service"
import { createLogger } from "@/libs/utils/logger"
import type { InsertJobLogInput } from "@/modules/job-logs/job-log.types"

const jobLogger = createLogger("job-worker")
const msgLogger = createLogger("msg-worker")
const workerLogger = createLogger("worker")

async function processJob(jobName: JobName): Promise<void> {
  workerLogger.info(`starting job: ${jobName}`)

  switch (jobName) {
    case "health-survey-dispatcher": {
      const [dispatchResult, autoResult] = await Promise.all([runHealthSurveyDispatcher(), runHealthSurveyAutoDispatchScheduler()])
      workerLogger.success("health-survey-dispatcher", { dispatch: dispatchResult, auto: autoResult })
      break
    }
    case "health-survey-adherence-checker": {
      const result = await checkHealthSurveyDispatchAdherence()
      workerLogger.success("health-survey-adherence-checker", result)
      break
    }
    case "health-survey-score-alert-detector": {
      await detectLowScoreAlerts()
      await detectScoreDropAlerts()
      await detectNegativeTrendAlerts()
      await detectConsentExpiredAlerts()
      workerLogger.success("health-survey-score-alert-detector: done")
      break
    }
    case "employee-unpause": {
      const result = await unpauseAllTenantsDueEmployees()
      workerLogger.success("employee-unpause", result)
      break
    }
    case "pgr-review-reminder": {
      const result = await sendPgrReviewReminders()
      workerLogger.success("pgr-review-reminder", result)
      break
    }
    case "stripe-webhook-retry": {
      const result = await retryFailedWebhookEvents()
      workerLogger.success("stripe-webhook-retry", result)
      break
    }
    case "health-survey-response-token-cleanup": {
      const result = await deleteAllTenantsExpiredHealthSurveyTokens()
      workerLogger.success(`health-survey-response-token-cleanup: deleted ${result.count} expired tokens`)
      break
    }
    case "action-plan-suggestion-generator": {
      const result = await runActionPlanSuggestionGenerator()
      workerLogger.success("action-plan-suggestion-generator", result)
      break
    }
    case "organization-deletion-executor": {
      const result = await runOrganizationDeletionExecutor()
      workerLogger.success("organization-deletion-executor", result)
      break
    }
  }
}

async function processMessageJob(data: SendMessageJobData): Promise<void> {
  const messaging = getMessagingService()
  const result = await messaging.send({
    to: data.to,
    body: data.body,
    ...(data.templateName !== undefined ? { templateName: data.templateName } : {}),
    ...(data.templateVariables !== undefined ? { templateVariables: data.templateVariables } : {}),
  })
  await createMessageLog(data.tenantId, {
    employeeId: data.employeeId,
    type: data.type,
    provider: data.provider,
    status: result.status === "failed" ? "failed" : "sent",
    externalId: result.externalId,
  })
}

function buildJobLogInput(
  job: { id?: string | null; name: string; data: unknown; attemptsMade: number; opts: { attempts?: number }; timestamp: number; processedOn?: number | null; finishedOn?: number | null },
  queueName: string,
  status: "completed" | "failed",
  result?: unknown,
  error?: Error,
): InsertJobLogInput {
  const finishedAt = new Date()
  const startedAt = job.processedOn !== null && job.processedOn !== undefined ? new Date(job.processedOn) : undefined
  const durationMs = startedAt !== undefined ? finishedAt.getTime() - startedAt.getTime() : undefined

  return {
    jobId: job.id ?? "",
    jobName: job.name,
    queueName,
    status,
    attemptNumber: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 1,
    payload: job.data,
    queuedAt: new Date(job.timestamp),
    finishedAt,
    ...(result !== undefined ? { result } : {}),
    ...(startedAt !== undefined ? { startedAt } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(error?.message !== undefined ? { errorMessage: error.message } : {}),
    ...(error?.stack !== undefined ? { errorStack: error.stack } : {}),
  }
}

const jobWorker = createJobWorker(processJob)
const messageWorker = createMessageWorker(processMessageJob)

jobWorker.on("completed", (job, result) => {
  jobLogger.success(`completed: ${job.name} (id: ${job.id})`, result)
  jobLogService.insertJobLog(buildJobLogInput(job, QUEUE_NAME, "completed", result)).catch((err: Error) => {
    jobLogger.error(`failed to write job log: ${err.message}`)
  })
})

jobWorker.on("failed", (job, err) => {
  jobLogger.error(`failed: ${job?.name} (id: ${job?.id}) — ${err.message}`)
  if (job !== undefined) {
    jobLogService.insertJobLog(buildJobLogInput(job, QUEUE_NAME, "failed", undefined, err)).catch((logErr: Error) => {
      jobLogger.error(`failed to write job log: ${logErr.message}`)
    })
  }
})

jobWorker.on("error", (err) => {
  jobLogger.error("worker error", err)
})

messageWorker.on("completed", (job) => {
  const maskedPhone = `***${String(job.data.to).slice(-4)}`
  msgLogger.success(`sent to ${maskedPhone} (id: ${job.id})`)
  jobLogService.insertJobLog(buildJobLogInput(job, MESSAGE_QUEUE_NAME, "completed", { to: maskedPhone, type: job.data.type })).catch((err: Error) => {
    msgLogger.error(`failed to write job log: ${err.message}`)
  })
})

messageWorker.on("failed", (job, err) => {
  const maskedPhone = `***${String(job?.data.to).slice(-4)}`
  msgLogger.error(`failed to ${maskedPhone} (attempt ${job?.attemptsMade ?? 0}) — ${err.message}`)
  if (job !== undefined) {
    jobLogService.insertJobLog(buildJobLogInput(job, MESSAGE_QUEUE_NAME, "failed", undefined, err)).catch((logErr: Error) => {
      msgLogger.error(`failed to write job log: ${logErr.message}`)
    })
  }
})

messageWorker.on("error", (err) => {
  msgLogger.error("worker error", err)
})

workerLogger.info("Pulse job worker started. Waiting for jobs...")

function gracefulShutdown(signal: string): void {
  void (async () => {
    workerLogger.warn(`${signal} received, shutting down gracefully...`)
    await Promise.all([jobWorker.close(), messageWorker.close()])
    await prisma.$disconnect()
    process.exit(0)
  })()
}

process.on("SIGTERM", () => { gracefulShutdown("SIGTERM") })
process.on("SIGINT", () => { gracefulShutdown("SIGINT") })
