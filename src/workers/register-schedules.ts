import { createJobQueue, type JobName } from "@/libs/queue"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("register-schedules")

const REPEAT_SCHEDULES: Record<JobName, string> = {
  "health-survey-dispatcher":              "*/5 * * * *",
  "health-survey-adherence-checker":       "0 * * * *",
  "health-survey-score-alert-detector":    "0 3 * * *",
  "employee-unpause":               "0 1 * * *",
  "pgr-review-reminder":            "0 8 * * *",
  "stripe-webhook-retry":           "0 * * * *",
  "health-survey-response-token-cleanup":  "0 2 * * *",
  "action-plan-suggestion-generator": "0 6 * * *",
  "organization-deletion-executor": "30 3 * * *",
  "health-survey-response-reminder": "0 * * * *",
  "climate-survey-dispatcher": "*/5 * * * *",
  "climate-survey-response-reminder": "0 * * * *",
  "climate-survey-response-token-cleanup": "0 2 * * *",
  "climate-survey-action-suggestion-generator": "0 5 * * *",
  "data-ingestion-processor":       "*/2 * * * *",
}

async function removeStaleSchedulers(queue: ReturnType<typeof createJobQueue>): Promise<void> {
  const activeJobNames = new Set(Object.keys(REPEAT_SCHEDULES))
  const existing = await queue.getJobSchedulers()

  const stale = existing.filter((s) => !activeJobNames.has(s.key))

  if (stale.length === 0) {
    logger.info("no stale schedulers found")
    return
  }

  for (const scheduler of stale) {
    await queue.removeJobScheduler(scheduler.key)
    logger.warn(`removed stale scheduler: ${scheduler.key}`)
  }
}

async function registerScheduledJobs(): Promise<void> {
  const queue = createJobQueue()

  await removeStaleSchedulers(queue)

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
