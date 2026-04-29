import { Queue, Worker, type ConnectionOptions } from "bullmq"

import { env } from "@/env"

const redisConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
}

export const QUEUE_NAME = "pulse-jobs" as const
export const MESSAGE_QUEUE_NAME = "pulse-messages" as const

export type JobName =
  | "health-survey-dispatcher"
  | "health-survey-adherence-checker"
  | "health-survey-score-alert-detector"
  | "employee-unpause"
  | "pgr-review-reminder"
  | "stripe-webhook-retry"
  | "health-survey-response-token-cleanup"
  | "action-plan-suggestion-generator"
  | "organization-deletion-executor"

export interface SendMessageJobData {
  to: string
  body: string
  tenantId: string
  employeeId: string
  provider: string
  type: "consent_invite" | "health_survey_dispatch" | "health_survey_resend"
  templateName?: string
  templateVariables?: string[]
}

export function createJobQueue(): Queue<Record<string, never>, void, JobName> {
  return new Queue<Record<string, never>, void, JobName>(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  })
}

export function createJobWorker(
  processor: (jobName: JobName) => Promise<void>,
): Worker<Record<string, never>, void, JobName> {
  return new Worker<Record<string, never>, void, JobName>(
    QUEUE_NAME,
    async (job) => {
      await processor(job.name)
    },
    { connection: redisConnection, concurrency: 1 },
  )
}

let _messageQueue: Queue<SendMessageJobData> | null = null

export function getMessageQueue(): Queue<SendMessageJobData> {
  _messageQueue ??= new Queue<SendMessageJobData>(MESSAGE_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    })
  return _messageQueue
}

export function createMessageWorker(
  processor: (data: SendMessageJobData) => Promise<void>,
): Worker<SendMessageJobData> {
  return new Worker<SendMessageJobData>(
    MESSAGE_QUEUE_NAME,
    async (job) => {
      await processor(job.data)
    },
    { connection: redisConnection, concurrency: 10 },
  )
}

export { redisConnection }
