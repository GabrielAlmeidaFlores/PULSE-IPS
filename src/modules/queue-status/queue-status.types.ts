export interface QueueCounts {
  waiting: number
  active: number
  delayed: number
  failed: number
  completed: number
  paused: number
}

export interface LiveJobSummary {
  id: string
  name: string
  queueName: string
  status: "active" | "waiting" | "delayed" | "failed"
  attemptsMade: number
  maxAttempts: number
  data: unknown
  timestamp: number
  processedOn: number | undefined
  failedReason: string | undefined
  delay: number | undefined
  nextRunAt: number | undefined
}

export interface RepeatableJobInfo {
  key: string
  name: string
  cron: string
  nextRunAt: number | null
  endDate: number | null
}

export interface QueueOverview {
  queues: QueueStatus[]
}

export interface QueueStatus {
  name: string
  counts: QueueCounts
  activeJobs: LiveJobSummary[]
  waitingJobs: LiveJobSummary[]
  delayedJobs: LiveJobSummary[]
  failedJobs: LiveJobSummary[]
  repeatableJobs: RepeatableJobInfo[]
}
