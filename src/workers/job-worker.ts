import { createJobWorker, createMessageWorker, QUEUE_NAME, MESSAGE_QUEUE_NAME, type JobName, type SendMessageJobData } from "@/libs/queue"
import { getMessagingService } from "@/libs/integrations"
import { prisma } from "@/libs/db"
import { runSurveyDispatcher, checkDispatchAdherence, runAutoDispatchScheduler } from "@/modules/surveys/survey-dispatch.service"
import { detectLowScoreAlerts, detectScoreDropAlerts, detectNegativeTrendAlerts, detectConsentExpiredAlerts } from "@/modules/alerts/alert.service"
import { unpauseDueEmployees } from "@/modules/employees/employee.service"
import { sendPgrReviewReminders } from "@/modules/pgr/pgr.service"
import { retryFailedWebhookEvents } from "@/modules/billing/webhook.handler"
import { createMessageLog, deleteExpiredTokens } from "@/modules/surveys/survey.repository"
import { jobLogService } from "@/modules/job-logs/job-log.service"
import { runActionPlanSuggestionGenerator } from "@/modules/action-plans/action-plan-suggestion.service"
import type { InsertJobLogInput } from "@/modules/job-logs/job-log.types"

async function processJob(jobName: JobName): Promise<void> {
  console.log(`[worker] starting job: ${jobName}`)

  switch (jobName) {
    case "survey-dispatcher": {
      const [dispatchResult, autoResult] = await Promise.all([runSurveyDispatcher(), runAutoDispatchScheduler()])
      console.log(`[worker] survey-dispatcher: ${JSON.stringify({ dispatch: dispatchResult, auto: autoResult })}`)
      break
    }
    case "survey-adherence-checker": {
      const result = await checkDispatchAdherence()
      console.log(`[worker] survey-adherence-checker: ${JSON.stringify(result)}`)
      break
    }
    case "survey-score-alert-detector": {
      await detectLowScoreAlerts()
      await detectScoreDropAlerts()
      await detectNegativeTrendAlerts()
      await detectConsentExpiredAlerts()
      console.log(`[worker] survey-score-alert-detector: done`)
      break
    }
    case "employee-unpause": {
      const result = await unpauseDueEmployees()
      console.log(`[worker] employee-unpause: ${JSON.stringify(result)}`)
      break
    }
    case "pgr-review-reminder": {
      const result = await sendPgrReviewReminders()
      console.log(`[worker] pgr-review-reminder: ${JSON.stringify(result)}`)
      break
    }
    case "stripe-webhook-retry": {
      const result = await retryFailedWebhookEvents()
      console.log(`[worker] stripe-webhook-retry: ${JSON.stringify(result)}`)
      break
    }
    case "survey-response-token-cleanup": {
      const result = await deleteExpiredTokens()
      console.log(`[worker] survey-response-token-cleanup: deleted ${result.count} expired tokens`)
      break
    }
    case "action-plan-suggestion-generator": {
      const result = await runActionPlanSuggestionGenerator()
      console.log(`[worker] action-plan-suggestion-generator: ${JSON.stringify(result)}`)
      break
    }
  }
}

async function processMessageJob(data: SendMessageJobData): Promise<void> {
  const messaging = getMessagingService()
  const result = await messaging.send({ to: data.to, body: data.body })
  await createMessageLog({
    tenantId: data.tenantId,
    employeeId: data.employeeId,
    type: data.type,
    provider: data.provider,
    status: result.status === "failed" ? "failed" : "sent",
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
  console.log(`[job-worker] completed: ${job.name} (id: ${job.id})`)
  jobLogService.insertJobLog(buildJobLogInput(job, QUEUE_NAME, "completed", result)).catch((err: Error) => {
    console.error(`[job-worker] failed to write job log: ${err.message}`)
  })
})

jobWorker.on("failed", (job, err) => {
  console.error(`[job-worker] failed: ${job?.name} (id: ${job?.id}) — ${err.message}`)
  if (job !== undefined) {
    jobLogService.insertJobLog(buildJobLogInput(job, QUEUE_NAME, "failed", undefined, err)).catch((logErr: Error) => {
      console.error(`[job-worker] failed to write job log: ${logErr.message}`)
    })
  }
})

jobWorker.on("error", (err) => {
  console.error(`[job-worker] error:`, err)
})

messageWorker.on("completed", (job) => {
  const maskedPhone = `***${String(job.data.to).slice(-4)}`
  console.log(`[msg-worker] sent to ${maskedPhone} (id: ${job.id})`)
  jobLogService.insertJobLog(buildJobLogInput(job, MESSAGE_QUEUE_NAME, "completed", { to: maskedPhone, type: job.data.type })).catch((err: Error) => {
    console.error(`[msg-worker] failed to write job log: ${err.message}`)
  })
})

messageWorker.on("failed", (job, err) => {
  const maskedPhone = `***${String(job?.data.to).slice(-4)}`
  console.error(`[msg-worker] failed to ${maskedPhone} (attempt ${job?.attemptsMade ?? 0}) — ${err.message}`)
  if (job !== undefined) {
    jobLogService.insertJobLog(buildJobLogInput(job, MESSAGE_QUEUE_NAME, "failed", undefined, err)).catch((logErr: Error) => {
      console.error(`[msg-worker] failed to write job log: ${logErr.message}`)
    })
  }
})

messageWorker.on("error", (err) => {
  console.error(`[msg-worker] error:`, err)
})

console.log("[worker] Pulse job worker started. Waiting for jobs...")

function gracefulShutdown(signal: string): void {
  void (async () => {
    console.log(`[worker] ${signal} received, shutting down gracefully...`)
    await Promise.all([jobWorker.close(), messageWorker.close()])
    await prisma.$disconnect()
    process.exit(0)
  })()
}

process.on("SIGTERM", () => { gracefulShutdown("SIGTERM") })
process.on("SIGINT", () => { gracefulShutdown("SIGINT") })
