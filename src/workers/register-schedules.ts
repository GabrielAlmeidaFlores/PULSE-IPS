import { createJobQueue, type JobName } from "@/libs/queue"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("register-schedules")

const REPEAT_SCHEDULES: Record<JobName, string> = {
  "health-survey-dispatcher":              "*/15 * * * *",
  "health-survey-adherence-checker":       "0 * * * *",
  "health-survey-score-alert-detector":    "0 3 * * *",
  "employee-unpause":               "0 1 * * *",
  "pgr-review-reminder":            "0 8 * * *",
  "stripe-webhook-retry":           "0 * * * *",
  "health-survey-response-token-cleanup":  "0 2 * * *",
  "action-plan-suggestion-generator": "0 6 * * *",
  "organization-deletion-executor": "30 3 * * *",
}

async function registerScheduledJobs(): Promise<void> {
  const queue = createJobQueue()

  for (const [jobName, pattern] of Object.entries(REPEAT_SCHEDULES) as [JobName, string][]) {
    await queue.upsertJobScheduler(
      jobName,
      { pattern },
      { name: jobName, data: {} },
    )
    logger.success(`registered: ${jobName} → ${pattern}`)
  }

  await queue.close()
  logger.success("all scheduled jobs registered.")
}

registerScheduledJobs().catch((err: Error) => {
  logger.error("failed to register scheduled jobs", err.message)
  process.exit(1)
})
