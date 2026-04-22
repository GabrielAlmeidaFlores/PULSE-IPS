import { Queue } from "bullmq"
import { QUEUE_NAME, MESSAGE_QUEUE_NAME, redisConnection } from "@/libs/queue"
import type { QueueOverview, QueueStatus, LiveJobSummary, RepeatableJobInfo, QueueCounts } from "@/modules/queue-status/queue-status.types"

const LIVE_JOB_LIMIT = 20

async function buildQueueStatus(queue: Queue, queueName: string): Promise<QueueStatus> {
  const [counts, activeJobs, waitingJobs, delayedJobs, failedJobs, repeatableJobs] = await Promise.all([
    queue.getJobCounts("active", "waiting", "delayed", "failed", "completed", "paused"),
    queue.getActive(0, LIVE_JOB_LIMIT - 1),
    queue.getWaiting(0, LIVE_JOB_LIMIT - 1),
    queue.getDelayed(0, LIVE_JOB_LIMIT - 1),
    queue.getFailed(0, LIVE_JOB_LIMIT - 1),
    queue.getRepeatableJobs(),
  ])

  const typedCounts: QueueCounts = {
    waiting: (counts as Record<string, number>)["waiting"] ?? 0,
    active: (counts as Record<string, number>)["active"] ?? 0,
    delayed: (counts as Record<string, number>)["delayed"] ?? 0,
    failed: (counts as Record<string, number>)["failed"] ?? 0,
    completed: (counts as Record<string, number>)["completed"] ?? 0,
    paused: (counts as Record<string, number>)["paused"] ?? 0,
  }

  const toSummary = (
    status: LiveJobSummary["status"],
  ) => (job: { id?: string | null; name: string; data: unknown; attemptsMade: number; opts: { attempts?: number; delay?: number }; timestamp: number; processedOn?: number | null; finishedOn?: number | null; failedReason?: string }): LiveJobSummary => ({
    id: job.id ?? "",
    name: job.name,
    queueName,
    status,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 1,
    data: job.data,
    timestamp: job.timestamp,
    processedOn: job.processedOn ?? undefined,
    failedReason: job.failedReason,
    delay: job.opts.delay,
    nextRunAt: undefined,
  })

  const toRepeatableInfo = (r: { key: string; name: string; pattern?: string | null; next?: number | null; endDate?: number | null }): RepeatableJobInfo => ({
    key: r.key,
    name: r.name,
    cron: r.pattern ?? "",
    nextRunAt: r.next ?? null,
    endDate: r.endDate ?? null,
  })

  return {
    name: queueName,
    counts: typedCounts,
    activeJobs: activeJobs.map(toSummary("active")),
    waitingJobs: waitingJobs.map(toSummary("waiting")),
    delayedJobs: delayedJobs.map(toSummary("delayed")),
    failedJobs: failedJobs.map(toSummary("failed")),
    repeatableJobs: repeatableJobs.map(toRepeatableInfo),
  }
}

async function getQueueOverview(): Promise<QueueOverview> {
  const jobQueue = new Queue(QUEUE_NAME, { connection: redisConnection })
  const messageQueue = new Queue(MESSAGE_QUEUE_NAME, { connection: redisConnection })

  try {
    const [jobStatus, messageStatus] = await Promise.all([
      buildQueueStatus(jobQueue, QUEUE_NAME),
      buildQueueStatus(messageQueue, MESSAGE_QUEUE_NAME),
    ])

    return { queues: [jobStatus, messageStatus] }
  } finally {
    await Promise.all([jobQueue.close(), messageQueue.close()])
  }
}

export const queueStatusService = { getQueueOverview }
