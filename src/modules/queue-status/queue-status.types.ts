export interface IQueueReader {
  getJobCounts(...types: string[]): Promise<Record<string, number>>
  getActive(start?: number, end?: number): Promise<{ id?: string | null; name: string; data: unknown; attemptsMade: number; opts: { attempts?: number; delay?: number }; timestamp: number; processedOn?: number | null; finishedOn?: number | null; failedReason?: string }[]>
  getWaiting(start?: number, end?: number): Promise<{ id?: string | null; name: string; data: unknown; attemptsMade: number; opts: { attempts?: number; delay?: number }; timestamp: number; processedOn?: number | null; finishedOn?: number | null; failedReason?: string }[]>
  getDelayed(start?: number, end?: number): Promise<{ id?: string | null; name: string; data: unknown; attemptsMade: number; opts: { attempts?: number; delay?: number }; timestamp: number; processedOn?: number | null; finishedOn?: number | null; failedReason?: string }[]>
  getFailed(start?: number, end?: number): Promise<{ id?: string | null; name: string; data: unknown; attemptsMade: number; opts: { attempts?: number; delay?: number }; timestamp: number; processedOn?: number | null; finishedOn?: number | null; failedReason?: string }[]>
  getRepeatableJobs(): Promise<{ key: string; name: string; pattern?: string | null; next?: number | null; endDate?: number | null }[]>
  close(): Promise<void>
}


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
