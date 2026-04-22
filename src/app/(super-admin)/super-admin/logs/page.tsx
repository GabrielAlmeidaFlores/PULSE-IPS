import { type ReactElement, Suspense } from "react"
import { requestLogService } from "@/modules/request-logs/request-log.service"
import type { RequestLogFilters } from "@/modules/request-logs/request-log.types"
import { LogsTable } from "@/app/(super-admin)/super-admin/logs/logs-table"
import { LogsFilters } from "@/app/(super-admin)/super-admin/logs/logs-filters"

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

const STATUS_GROUPS = ["2xx", "3xx", "4xx", "5xx"] as const

function parseFilters(params: Record<string, string | undefined>): RequestLogFilters {
  const dateFromStr = params["dateFrom"]
  const dateToStr = params["dateTo"]
  const pageStr = params["page"]
  const dateFrom = dateFromStr !== undefined ? new Date(dateFromStr) : undefined
  const dateTo = dateToStr !== undefined ? new Date(dateToStr) : undefined
  const page = pageStr !== undefined ? parseInt(pageStr, 10) : 1
  const statusGroup = params["statusGroup"] as RequestLogFilters["statusGroup"] | undefined

  const pageSizeStr = params["pageSize"]
  const pageSizeRaw = pageSizeStr !== undefined ? parseInt(pageSizeStr, 10) : 10
  const pageSize = [10, 20, 30, 40, 50].includes(pageSizeRaw) ? pageSizeRaw : 10

  const filters: RequestLogFilters = {
    pageSize,
    page: !isNaN(page) && page > 0 ? page : 1,
  }

  const method = params["method"]
  if (method !== undefined) filters.method = method

  const path = params["path"]
  if (path !== undefined) filters.pathContains = path

  if (statusGroup !== undefined && STATUS_GROUPS.includes(statusGroup)) filters.statusGroup = statusGroup

  const userType = params["userType"]
  if (userType !== undefined) filters.userType = userType

  if (dateFrom !== undefined && !isNaN(dateFrom.getTime())) filters.dateFrom = dateFrom
  if (dateTo !== undefined && !isNaN(dateTo.getTime())) filters.dateTo = dateTo

  return filters
}

export default async function LogsPage({ searchParams }: Props): Promise<ReactElement> {
  const params = await searchParams
  const filters = parseFilters(params)
  const data = await requestLogService.getLogs(filters)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border bg-card shrink-0">
        <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Logs de Requisições</h1>
        <p className="text-[11px] text-muted-foreground">
          Histórico de todas as requisições HTTP da plataforma
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <LogsFilters filters={filters} />
        <Suspense fallback={null}>
          <LogsTable data={data} />
        </Suspense>
      </div>
    </div>
  )
}
