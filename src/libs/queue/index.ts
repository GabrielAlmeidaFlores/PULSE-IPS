import { Queue, Worker, type ConnectionOptions } from "bullmq"

import { env } from "@/env"

const redisConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
}

export const QUEUE_NAME = "pulse-jobs" as const
export const MESSAGE_QUEUE_NAME = "pulse-messages" as const
export const EMAIL_QUEUE_NAME = "pulse-emails" as const

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
  | "health-survey-response-reminder"
  | "climate-survey-dispatcher"
  | "climate-survey-response-reminder"
  | "climate-survey-response-token-cleanup"
  | "data-ingestion-processor"

export interface SendMessageJobData {
  recipientPhone: string
  recipientName: string
  orgName: string
  surveyLink: string
  tenantId: string
  employeeId: string
  provider: string
  type: "health_survey_dispatch" | "health_survey_reminder" | "climate_survey_dispatch" | "climate_survey_reminder"
  dispatchId?: string
}

export interface ProcessSendMessageJobContext {
  data: SendMessageJobData
  jobId: string | null
  attemptsMade: number
  maxAttempts: number
}

export interface SendEmailJobData {
  recipientEmail: string
  recipientName: string
  orgName: string
  surveyLink: string
  tenantId: string
  employeeId: string
  provider: string
  type: "climate_survey_dispatch" | "climate_survey_reminder"
  tokenExpiryHours: number
  dispatchId?: string
}

export interface ProcessSendEmailJobContext {
  data: SendEmailJobData
  jobId: string | null
  attemptsMade: number
  maxAttempts: number
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

let _jobQueue: Queue<Record<string, never>, void, JobName> | null = null

export function getJobQueue(): Queue<Record<string, never>, void, JobName> {
  _jobQueue ??= createJobQueue()
  return _jobQueue
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
  processor: (context: ProcessSendMessageJobContext) => Promise<void>,
): Worker<SendMessageJobData> {
  return new Worker<SendMessageJobData>(
    MESSAGE_QUEUE_NAME,
    async (job) => {
      await processor({
        data: job.data,
        jobId: job.id ?? null,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts ?? 3,
      })
    },
    { connection: redisConnection, concurrency: 10 },
  )
}

export function createJobQueueReader(): Queue<Record<string, never>, void, JobName> {
  return new Queue<Record<string, never>, void, JobName>(QUEUE_NAME, { connection: redisConnection })
}

export function createMessageQueueReader(): Queue<SendMessageJobData> {
  return new Queue<SendMessageJobData>(MESSAGE_QUEUE_NAME, { connection: redisConnection })
}

let _emailQueue: Queue<SendEmailJobData> | null = null

export function getEmailQueue(): Queue<SendEmailJobData> {
  _emailQueue ??= new Queue<SendEmailJobData>(EMAIL_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  })
  return _emailQueue
}

export function createEmailWorker(
  processor: (context: ProcessSendEmailJobContext) => Promise<void>,
): Worker<SendEmailJobData> {
  return new Worker<SendEmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job) => {
      await processor({
        data: job.data,
        jobId: job.id ?? null,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts ?? 3,
      })
    },
    { connection: redisConnection, concurrency: 10 },
  )
}

export function createEmailQueueReader(): Queue<SendEmailJobData> {
  return new Queue<SendEmailJobData>(EMAIL_QUEUE_NAME, { connection: redisConnection })
}
