import {
  QUEUE_NAME,
  MESSAGE_QUEUE_NAME,
  EMAIL_QUEUE_NAME,
  createJobQueueReader,
  createMessageQueueReader,
  createEmailQueueReader,
} from "@/libs/queue"
import type { IQueueReader, QueueOverview, QueueStatus, LiveJobSummary, RepeatableJobInfo, QueueCounts } from "@/modules/queue-status/queue-status.types"

const LIVE_JOB_LIMIT = 100

async function buildQueueStatus(queue: IQueueReader, queueName: string): Promise<QueueStatus> {
  const [counts, activeJobs, waitingJobs, delayedJobs, failedJobs, repeatableJobs] = await Promise.all([
    queue.getJobCounts("active", "waiting", "delayed", "failed", "completed", "paused"),
    queue.getActive(0, LIVE_JOB_LIMIT - 1),
    queue.getWaiting(0, LIVE_JOB_LIMIT - 1),
    queue.getDelayed(0, LIVE_JOB_LIMIT - 1),
    queue.getFailed(0, LIVE_JOB_LIMIT - 1),
    queue.getRepeatableJobs(),
  ])

  const typedCounts: QueueCounts = {
    waiting: counts["waiting"] ?? 0,
    active: counts["active"] ?? 0,
    delayed: counts["delayed"] ?? 0,
    failed: counts["failed"] ?? 0,
    completed: counts["completed"] ?? 0,
    paused: counts["paused"] ?? 0,
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

  const defined = <T>(arr: (T | null | undefined)[]): T[] => arr.filter((x): x is T => x !== null && x !== undefined)

  return {
    name: queueName,
    counts: typedCounts,
    activeJobs: defined(activeJobs).map(toSummary("active")),
    waitingJobs: defined(waitingJobs).map(toSummary("waiting")),
    delayedJobs: defined(delayedJobs).map(toSummary("delayed")),
    failedJobs: defined(failedJobs).map(toSummary("failed")),
    repeatableJobs: defined(repeatableJobs).map(toRepeatableInfo),
  }
}

async function getQueueOverview(): Promise<QueueOverview> {
  const jobQueue = createJobQueueReader()
  const messageQueue = createMessageQueueReader()
  const emailQueue = createEmailQueueReader()

  try {
    const [jobStatus, messageStatus, emailStatus] = await Promise.all([
      buildQueueStatus(jobQueue, QUEUE_NAME),
      buildQueueStatus(messageQueue, MESSAGE_QUEUE_NAME),
      buildQueueStatus(emailQueue, EMAIL_QUEUE_NAME),
    ])

    return { queues: [jobStatus, messageStatus, emailStatus] }
  } finally {
    await Promise.all([jobQueue.close(), messageQueue.close(), emailQueue.close()])
  }
}

export const queueStatusService = { getQueueOverview }
