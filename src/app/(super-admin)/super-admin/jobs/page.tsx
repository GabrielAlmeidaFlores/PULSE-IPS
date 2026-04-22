import { Suspense } from "react"
import { LoadingSpinner } from "@/libs/design-system"
import { queueStatusService } from "@/modules/queue-status/queue-status.service"
import { jobLogService } from "@/modules/job-logs/job-log.service"
import type { JobLogFilters } from "@/modules/job-logs/job-log.types"
import { QueueOverviewSection } from "@/app/(super-admin)/super-admin/jobs/queue-overview-section"
import { JobLogsTable } from "@/app/(super-admin)/super-admin/jobs/job-logs-table"
import { JobLogsFilters } from "@/app/(super-admin)/super-admin/jobs/job-logs-filters"
import { Separator } from "@/components/ui/separator"

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

const VALID_PAGE_SIZES = [10, 20, 30, 50]

function parseFilters(params: Record<string, string | undefined>): JobLogFilters {
  const rawPageSize = Number(params["pageSize"] ?? "10")
  const pageSize = VALID_PAGE_SIZES.includes(rawPageSize) ? rawPageSize : 10
  const page = Math.max(1, Number(params["page"] ?? "1"))

  return {
    page,
    pageSize,
    ...(params["jobName"] !== undefined ? { jobName: params["jobName"] } : {}),
    ...(params["queueName"] !== undefined ? { queueName: params["queueName"] } : {}),
    ...(params["status"] !== undefined ? { status: params["status"] } : {}),
    ...(params["dateFrom"] !== undefined ? { dateFrom: new Date(`${params["dateFrom"]}T00:00:00`) } : {}),
    ...(params["dateTo"] !== undefined ? { dateTo: new Date(`${params["dateTo"]}T23:59:59`) } : {}),
  }
}

async function QueueStatusView(): Promise<React.ReactElement> {
  let overview: Awaited<ReturnType<typeof queueStatusService.getQueueOverview>> | null = null

  try {
    overview = await queueStatusService.getQueueOverview()
  } catch {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
        Não foi possível conectar ao Redis. Verifique se o serviço está ativo.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {overview.queues.map((queue) => (
        <QueueOverviewSection key={queue.name} queue={queue} />
      ))}
    </div>
  )
}

export default async function JobsPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  const params = await searchParams
  const filters = parseFilters(params)
  const logsPage = await jobLogService.getJobLogs(filters)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Monitoramento de Workers</h1>
          <p className="text-[11px] text-muted-foreground">Status das filas e histórico de execuções</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Status das Filas
          </h3>
          <Suspense fallback={<LoadingSpinner />}>
            <QueueStatusView />
          </Suspense>
        </section>

        <Separator />

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Histórico de Execuções
          </h3>
          <div className="space-y-4">
            <JobLogsFilters filters={filters} />
            <JobLogsTable
              rows={logsPage.rows}
              total={logsPage.total}
              page={logsPage.page}
              pageSize={logsPage.pageSize}
              totalPages={logsPage.totalPages}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
