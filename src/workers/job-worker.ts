import { createJobWorker, createMessageWorker, type JobName, type SendMessageJobData } from "@/libs/queue"
import { getMessagingService } from "@/libs/integrations"
import { prisma } from "@/libs/db"
import { runSurveyDispatcher, checkDispatchAdherence, runAutoDispatchScheduler } from "@/modules/surveys/survey-dispatch.service"
import { detectLowScoreAlerts } from "@/modules/alerts/alert.service"
import { unpauseDueEmployees } from "@/modules/employees/employee.service"
import { sendPgrReviewReminders } from "@/modules/pgr/pgr.service"
import { retryFailedWebhookEvents } from "@/modules/billing/webhook.handler"
import { createMessageLog, deleteExpiredTokens } from "@/modules/surveys/survey.repository"

async function processJob(jobName: JobName): Promise<void> {
  console.log(`[worker] starting job: ${jobName}`)

  switch (jobName) {
    case "survey-dispatcher": {
      const [dispatchResult, autoResult] = await Promise.all([runSurveyDispatcher(), runAutoDispatchScheduler()])
      console.log(`[worker] survey-dispatcher: ${JSON.stringify({ dispatch: dispatchResult, auto: autoResult })}`)
      break
    }
    case "adherence-checker": {
      const result = await checkDispatchAdherence()
      console.log(`[worker] adherence-checker: ${JSON.stringify(result)}`)
      break
    }
    case "alert-detector": {
      await detectLowScoreAlerts()
      console.log(`[worker] alert-detector: done`)
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
    case "token-cleanup": {
      const result = await deleteExpiredTokens()
      console.log(`[worker] token-cleanup: deleted ${result.count} expired tokens`)
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

const jobWorker = createJobWorker(processJob)
const messageWorker = createMessageWorker(processMessageJob)

jobWorker.on("completed", (job) => {
  console.log(`[job-worker] completed: ${job.name} (id: ${job.id})`)
})

jobWorker.on("failed", (job, err) => {
  console.error(`[job-worker] failed: ${job?.name} (id: ${job?.id}) — ${err.message}`)
})

jobWorker.on("error", (err) => {
  console.error(`[job-worker] error:`, err)
})

messageWorker.on("completed", (job) => {
  console.log(`[msg-worker] sent to ${job.data.to} (id: ${job.id})`)
})

messageWorker.on("failed", (job, err) => {
  console.error(`[msg-worker] failed to ${job?.data.to} (attempt ${job?.attemptsMade ?? 0}) — ${err.message}`)
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
