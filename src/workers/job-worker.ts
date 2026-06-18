import { createJobWorker, createMessageWorker, QUEUE_NAME, MESSAGE_QUEUE_NAME, type JobName, type SendMessageJobData } from "@/libs/queue"
import { getMessagingService } from "@/libs/integrations"
import { prisma } from "@/libs/db"
import { runHealthSurveyDispatcher, checkHealthSurveyDispatchAdherence, runHealthSurveyAutoDispatchScheduler } from "@/modules/health-surveys/health-survey-dispatch.service"
import { detectLowScoreAlerts, detectScoreDropAlerts, detectNegativeTrendAlerts } from "@/modules/alerts/alert.service"
import { unpauseAllTenantsDueEmployees } from "@/modules/employees/employee.service"
import { sendPgrReviewReminders } from "@/modules/pgr/pgr.service"
import { retryFailedWebhookEvents } from "@/modules/billing/webhook.handler"
import { createMessageLog } from "@/modules/messaging/message-log.repository"
import { deleteAllTenantsExpiredHealthSurveyTokens } from "@/modules/health-surveys/health-survey.repository"
import { jobLogService } from "@/modules/job-logs/job-log.service"
import { runActionPlanSuggestionGenerator } from "@/modules/action-plans/action-plan-suggestion.service"
import { runOrganizationDeletionExecutor } from "@/modules/organizations/account-deletion.service"
import { runHealthSurveyResponseReminder } from "@/modules/health-surveys/health-survey-reminder.service"
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
    case "health-survey-response-reminder": {
      await runHealthSurveyResponseReminder()
      workerLogger.success("health-survey-response-reminder: done")
      break
    }
  }
}

async function processMessageJob(data: SendMessageJobData): Promise<void> {
  const messaging = getMessagingService()
  const params = {
    recipientPhone: data.recipientPhone,
    recipientName: data.recipientName,
    surveyLink: data.surveyLink,
  }
  const result = data.type === "health_survey_dispatch"
    ? await messaging.sendHealthSurveyDispatch(params)
    : await messaging.sendHealthSurveyReminder(params)
  await createMessageLog(data.tenantId, {
    employeeId: data.employeeId,
    type: data.type,
    provider: data.provider,
    status: result.status === "failed" ? "failed" : "sent",
    ...(result.externalId !== null ? { externalId: result.externalId } : {}),
  })
}

function buildJobLogInput(
  job: { id?: string | null; name: string; data: unknown; attemptsMade: number; opts: { attempts?: number }; timestamp: number; processedOn?: number | null; finishedOn?: number | null },
  queueName: string,
  status: "completed" | "failed",
  result?: unknown,
  error?: Error,
): InsertJobLogInput | null {
  if (!job.id) return null
  const finishedAt = new Date()
  const startedAt = job.processedOn !== null && job.processedOn !== undefined ? new Date(job.processedOn) : undefined
  const durationMs = startedAt !== undefined ? finishedAt.getTime() - startedAt.getTime() : undefined

  return {
    jobId: job.id,
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

jobWorker.on("completed", (job, result): void => {
  jobLogger.success(`completed: ${job.name} (id: ${job.id})`, result)
  const logInput = buildJobLogInput(job, QUEUE_NAME, "completed", result)
  if (logInput !== null) {
    jobLogService.insertJobLog(logInput).catch((err: Error) => {
      jobLogger.error(`failed to write job log: ${err.message}`)
    })
  }
})

jobWorker.on("failed", (job, err): void => {
  jobLogger.error(`failed: ${job?.name} (id: ${job?.id}) — ${err.message}`)
  if (job !== undefined) {
    const logInput = buildJobLogInput(job, QUEUE_NAME, "failed", undefined, err)
    if (logInput !== null) {
      jobLogService.insertJobLog(logInput).catch((logErr: Error) => {
        jobLogger.error(`failed to write job log: ${logErr.message}`)
      })
    }
  }
})

jobWorker.on("error", (err): void => {
  jobLogger.error("worker error", err)
})

messageWorker.on("completed", (job): void => {
  const maskedPhone = `***${String(job.data.recipientPhone).slice(-4)}`
  msgLogger.success(`sent to ${maskedPhone} (id: ${job.id})`)
  const logInput = buildJobLogInput(job, MESSAGE_QUEUE_NAME, "completed", { recipientPhone: maskedPhone, type: job.data.type })
  if (logInput !== null) {
    jobLogService.insertJobLog(logInput).catch((err: Error) => {
      msgLogger.error(`failed to write job log: ${err.message}`)
    })
  }
})

messageWorker.on("failed", (job, err): void => {
  const maskedPhone = `***${String(job?.data.recipientPhone).slice(-4)}`
  msgLogger.error(`failed to ${maskedPhone} (attempt ${job?.attemptsMade ?? 0}) — ${err.message}`)
  if (job !== undefined) {
    const logInput = buildJobLogInput(job, MESSAGE_QUEUE_NAME, "failed", undefined, err)
    if (logInput !== null) {
      jobLogService.insertJobLog(logInput).catch((logErr: Error) => {
        msgLogger.error(`failed to write job log: ${logErr.message}`)
      })
    }
  }
})

messageWorker.on("error", (err): void => {
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
