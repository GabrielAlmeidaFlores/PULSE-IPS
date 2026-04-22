export interface InsertRequestLogInput {
  method: string
  path: string
  query?: string | undefined
  ip?: string | undefined
  userAgent?: string | undefined
  requestHeaders: Record<string, string>
  requestBody?: Record<string, unknown> | undefined
  responseStatus?: number | undefined
  responseHeaders?: Record<string, string> | undefined
  responseBody?: Record<string, unknown> | undefined
  durationMs?: number | undefined
  tenantId?: string | undefined
  userId?: string | undefined
  userType?: string | undefined
  isRedirect?: boolean | undefined
  redirectTo?: string | undefined
  errorMessage?: string | undefined
  errorStack?: string | undefined
}

export interface RequestLogFilters {
  method?: string | undefined
  pathContains?: string | undefined
  statusGroup?: "2xx" | "3xx" | "4xx" | "5xx" | undefined
  userType?: string | undefined
  dateFrom?: Date | undefined
  dateTo?: Date | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export interface RequestLogRow {
  id: string
  method: string
  path: string
  query: string | null
  ip: string | null
  userAgent: string | null
  requestHeaders: Record<string, string>
  requestBody: Record<string, unknown> | null
  responseStatus: number | null
  responseHeaders: Record<string, string> | null
  responseBody: Record<string, unknown> | null
  durationMs: number | null
  tenantId: string | null
  userId: string | null
  userType: string | null
  isRedirect: boolean
  redirectTo: string | null
  errorMessage: string | null
  errorStack: string | null
  createdAt: Date
}

export interface RequestLogPage {
  rows: RequestLogRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
