import { createJobQueue, type JobName } from "@/libs/queue"

const REPEAT_SCHEDULES: Record<JobName, string> = {
  "survey-dispatcher": "*/15 * * * *",
  "adherence-checker": "0 * * * *",
  "alert-detector":    "0 3 * * *",
  "employee-unpause":  "0 1 * * *",
  "pgr-review-reminder": "0 8 * * *",
  "stripe-webhook-retry": "0 * * * *",
  "token-cleanup":     "0 2 * * *",
}

async function registerScheduledJobs(): Promise<void> {
  const queue = createJobQueue()

  for (const [jobName, pattern] of Object.entries(REPEAT_SCHEDULES) as [JobName, string][]) {
    await queue.upsertJobScheduler(
      jobName,
      { pattern },
      { name: jobName, data: {} },
    )
    console.log(`Registered job: ${jobName} → ${pattern}`)
  }

  await queue.close()
  console.log("All scheduled jobs registered.")
}

registerScheduledJobs().catch((err) => {
  console.error("Failed to register scheduled jobs:", err)
  process.exit(1)
})
