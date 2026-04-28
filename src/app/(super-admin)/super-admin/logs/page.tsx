import { type ReactElement, Suspense } from "react"
import { requestLogService } from "@/modules/request-logs/request-log.service"
import type { RequestLogFilters } from "@/modules/request-logs/request-log.types"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { LogsTable } from "@/app/(super-admin)/super-admin/logs/logs-table"
import { LogsFilters } from "@/app/(super-admin)/super-admin/logs/logs-filters"

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

const VALID_STATUS_GROUPS = ["2xx", "3xx", "4xx", "5xx"] as const

export default async function LogsPage({ searchParams }: Props): Promise<ReactElement> {
  const params = await searchParams
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])
  const filters: RequestLogFilters = { page, pageSize }

  if (params["method"] !== undefined) filters.method = params["method"]
  if (params["path"] !== undefined) filters.pathContains = params["path"]
  if (params["userType"] !== undefined) filters.userType = params["userType"]

  const rawStatusGroup = params["statusGroup"] as RequestLogFilters["statusGroup"] | undefined
  if (rawStatusGroup !== undefined && VALID_STATUS_GROUPS.includes(rawStatusGroup)) {
    filters.statusGroup = rawStatusGroup
  }

  if (params["dateFrom"] !== undefined) {
    const d = new Date(params["dateFrom"])
    if (!isNaN(d.getTime())) filters.dateFrom = d
  }
  if (params["dateTo"] !== undefined) {
    const d = new Date(params["dateTo"])
    if (!isNaN(d.getTime())) filters.dateTo = d
  }

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
