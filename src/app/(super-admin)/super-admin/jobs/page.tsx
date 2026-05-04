import { Suspense } from "react"
import { LoadingSpinner } from "@/libs/design-system"
import { queueStatusService } from "@/modules/queue-status/queue-status.service"
import { jobLogService } from "@/modules/job-logs/job-log.service"
import type { JobLogFilters } from "@/modules/job-logs/job-log.types"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { QueueOverviewSection } from "@/app/(super-admin)/super-admin/jobs/queue-overview-section"
import { JobLogsTable } from "@/app/(super-admin)/super-admin/jobs/job-logs-table"
import { JobLogsFilters } from "@/app/(super-admin)/super-admin/jobs/job-logs-filters"
import { Separator } from "@/components/ui/separator"
import { getOrganizationsByIds } from "@/modules/organizations/organization.service"
import { extractJobPayloadTenantId } from "@/app/(super-admin)/super-admin/jobs/job-payload-utils"

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

async function QueueStatusView(): Promise<React.ReactElement> {
  let overview: Awaited<ReturnType<typeof queueStatusService.getQueueOverview>> | null = null

  try {
    overview = await queueStatusService.getQueueOverview()
  } catch {
    return (
      <div className="rounded-md border border-status-warning-border bg-status-warning-subtle px-4 py-3 text-sm text-status-warning">
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
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])
  const filters: JobLogFilters = { page, pageSize }
  if (params["jobName"] !== undefined) filters.jobName = params["jobName"]
  if (params["queueName"] !== undefined) filters.queueName = params["queueName"]
  if (params["status"] !== undefined) filters.status = params["status"]
  if (params["dateFrom"] !== undefined) filters.dateFrom = new Date(`${params["dateFrom"]}T00:00:00`)
  if (params["dateTo"] !== undefined) filters.dateTo = new Date(`${params["dateTo"]}T23:59:59`)

  const logsPage = await jobLogService.getJobLogs(filters)

  const tenantIds = [...new Set(
    logsPage.rows.map((r) => extractJobPayloadTenantId(r.payload)).filter((id): id is string => id !== null)
  )]
  const orgs = tenantIds.length > 0 ? await getOrganizationsByIds(tenantIds) : []
  const orgMap: Record<string, { name: string; slug: string }> = {}
  for (const org of orgs) {
    orgMap[org.id] = { name: org.name, slug: org.slug }
  }

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
              orgMap={orgMap}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
