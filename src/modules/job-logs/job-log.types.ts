export interface InsertJobLogInput {
  jobId: string
  jobName: string
  queueName: string
  status: "completed" | "failed"
  attemptNumber: number
  maxAttempts: number
  payload: unknown
  result?: unknown
  errorMessage?: string
  errorStack?: string
  queuedAt?: Date
  startedAt?: Date
  finishedAt?: Date
  durationMs?: number
}

export interface JobLogFilters {
  jobName?: string
  queueName?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
  page?: number
  pageSize?: number
}

export interface JobLogRow {
  id: string
  jobId: string
  jobName: string
  queueName: string
  status: string
  attemptNumber: number
  maxAttempts: number
  payload: unknown
  result: unknown
  errorMessage: string | null
  errorStack: string | null
  queuedAt: Date | null
  startedAt: Date | null
  finishedAt: Date | null
  durationMs: number | null
  createdAt: Date
}

export interface JobLogPage {
  rows: JobLogRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
