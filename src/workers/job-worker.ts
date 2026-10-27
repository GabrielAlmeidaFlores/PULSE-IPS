import "dotenv/config"
import { createJobWorker, createMessageWorker, createEmailWorker, QUEUE_NAME, MESSAGE_QUEUE_NAME, EMAIL_QUEUE_NAME, type JobName, type ProcessSendMessageJobContext, type ProcessSendEmailJobContext } from "@/libs/queue"
import { prisma } from "@/libs/db"
import { runHealthSurveyDispatcher, checkHealthSurveyDispatchAdherence, runHealthSurveyAutoDispatchScheduler } from "@/modules/health-surveys/health-survey-dispatch.service"
import { runClimateSurveyDispatcher, runClimateSurveyAutoDispatchScheduler } from "@/modules/climate-surveys/climate-survey-dispatch.service"
import { detectLowScoreAlerts, detectScoreDropAlerts, detectNegativeTrendAlerts } from "@/modules/alerts/alert.service"
import { unpauseAllTenantsDueEmployees } from "@/modules/employees/employee.service"
import { sendPgrReviewReminders } from "@/modules/pgr/pgr.service"
import { retryFailedWebhookEvents } from "@/modules/billing/webhook.handler"
import {
  processOutboundSurveyMessage,
  recordOutboundSurveyMessageFinalFailure,
} from "@/modules/messaging/messaging.service"
import {
  processOutboundSurveyEmail,
  recordOutboundSurveyEmailFinalFailure,
} from "@/modules/messaging/survey-email.service"
import { deleteAllTenantsExpiredHealthSurveyTokens } from "@/modules/health-surveys/health-survey.repository"
import { deleteAllTenantsExpiredClimateSurveyTokens } from "@/modules/climate-surveys/climate-survey.repository"
import { jobLogService } from "@/modules/job-logs/job-log.service"
import { runActionPlanSuggestionGenerator } from "@/modules/action-plans/action-plan-suggestion.service"
import { runOrganizationDeletionExecutor } from "@/modules/organizations/account-deletion.service"
import { runHealthSurveyResponseReminder } from "@/modules/health-surveys/health-survey-reminder.service"
import { runClimateSurveyResponseReminder } from "@/modules/climate-surveys/climate-survey-reminder.service"
import { runClimateSurveyActionSuggestionGenerator } from "@/modules/climate-surveys/climate-survey-action-suggestion.service"
import { processPendingDataIngestionBatches } from "@/modules/data-ingestion/data-ingestion.service"
import { createLogger } from "@/libs/utils/logger"
import type { InsertJobLogInput } from "@/modules/job-logs/job-log.types"

const jobLogger = createLogger("job-worker")
const msgLogger = createLogger("msg-worker")
const emailLogger = createLogger("email-worker")
const workerLogger = createLogger("worker")

async function processJob(jobName: JobName): Promise<void> {
  workerLogger.info(`starting job: ${jobName}`)

  switch (jobName) {
    case "health-survey-dispatcher": {
      const [dispatchResult, autoResult] = await Promise.all([runHealthSurveyDispatcher(), runHealthSurveyAutoDispatchScheduler()])
      workerLogger.success("health-survey-dispatcher", { dispatch: dispatchResult, auto: autoResult })
      break
    }
    case "climate-survey-dispatcher": {
      const [dispatchResult, autoResult] = await Promise.all([runClimateSurveyDispatcher(), runClimateSurveyAutoDispatchScheduler()])
      workerLogger.success("climate-survey-dispatcher", { dispatch: dispatchResult, auto: autoResult })
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
    case "climate-survey-response-token-cleanup": {
      const result = await deleteAllTenantsExpiredClimateSurveyTokens()
      workerLogger.success(`climate-survey-response-token-cleanup: deleted ${result.count} expired tokens`)
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
    case "climate-survey-response-reminder": {
      await runClimateSurveyResponseReminder()
      workerLogger.success("climate-survey-response-reminder: done")
      break
    }
    case "climate-survey-action-suggestion-generator": {
      const result = await runClimateSurveyActionSuggestionGenerator()
      workerLogger.success("climate-survey-action-suggestion-generator", result)
      break
    }
    case "data-ingestion-processor": {
      const result = await processPendingDataIngestionBatches()
      workerLogger.success("data-ingestion-processor", result)
      break
    }
  }
}

async function processMessageJob(context: ProcessSendMessageJobContext): Promise<void> {
  await processOutboundSurveyMessage({
    data: context.data,
    queueJobId: context.jobId,
  })
}

async function processEmailJob(context: ProcessSendEmailJobContext): Promise<void> {
  await processOutboundSurveyEmail({
    data: context.data,
    queueJobId: context.jobId,
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
const emailWorker = createEmailWorker(processEmailJob)

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
    const maxAttempts = job.opts.attempts ?? 3
    if (job.attemptsMade >= maxAttempts) {
      recordOutboundSurveyMessageFinalFailure(job.data, job.id ?? null, err.message).catch((logErr: Error) => {
        msgLogger.error(`failed to write message log: ${logErr.message}`)
      })
    }
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

emailWorker.on("completed", (job): void => {
  const maskedEmail = job.data.recipientEmail.replace(/^[^@]+/, "***")
  emailLogger.success(`sent to ${maskedEmail} (id: ${job.id})`)
  const logInput = buildJobLogInput(job, EMAIL_QUEUE_NAME, "completed", { recipientEmail: maskedEmail, type: job.data.type })
  if (logInput !== null) {
    jobLogService.insertJobLog(logInput).catch((err: Error) => {
      emailLogger.error(`failed to write job log: ${err.message}`)
    })
  }
})

emailWorker.on("failed", (job, err): void => {
  const maskedEmail = job?.data.recipientEmail.replace(/^[^@]+/, "***") ?? "***"
  emailLogger.error(`failed to ${maskedEmail} (attempt ${job?.attemptsMade ?? 0}) — ${err.message}`)
  if (job !== undefined) {
    const maxAttempts = job.opts.attempts ?? 3
    if (job.attemptsMade >= maxAttempts) {
      recordOutboundSurveyEmailFinalFailure(job.data, job.id ?? null, err.message).catch((logErr: Error) => {
        emailLogger.error(`failed to write email log: ${logErr.message}`)
      })
    }
    const logInput = buildJobLogInput(job, EMAIL_QUEUE_NAME, "failed", undefined, err)
    if (logInput !== null) {
      jobLogService.insertJobLog(logInput).catch((logErr: Error) => {
        emailLogger.error(`failed to write job log: ${logErr.message}`)
      })
    }
  }
})

emailWorker.on("error", (err): void => {
  emailLogger.error("worker error", err)
})

workerLogger.info("Pulse job worker started. Waiting for jobs...")

function gracefulShutdown(signal: string): void {
  void (async () => {
    workerLogger.warn(`${signal} received, shutting down gracefully...`)
    await Promise.all([jobWorker.close(), messageWorker.close(), emailWorker.close()])
    await prisma.$disconnect()
    process.exit(0)
  })()
}

process.on("SIGTERM", () => { gracefulShutdown("SIGTERM") })
process.on("SIGINT", () => { gracefulShutdown("SIGINT") })
