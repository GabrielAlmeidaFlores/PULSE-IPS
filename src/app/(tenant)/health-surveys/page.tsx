import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getHealthSurveyDispatchesPaginatedByDay, type HealthSurveyDispatchWithConfig } from "@/modules/health-surveys/health-survey-dashboard.service"
import { getHealthSurveyConfigs } from "@/modules/health-surveys/health-survey-config.service"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { ScheduleHealthSurveyDispatchButton } from "@/app/(tenant)/health-surveys/schedule-health-survey-dispatch-button"
import { getOrganization } from "@/modules/organizations/organization.service"
import { HealthSurveyListFilters } from "@/app/(tenant)/health-surveys/health-survey-list-filters"
import { adherenceRateBarClass } from "@/libs/utils/health-index"
import { DataTable, TablePagination } from "@/libs/design-system"
import { PageHelp } from "@/components/page-help"
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react"

interface HealthSurveysListPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

const STATUS_PRIORITY: Record<string, number> = {
  failed: 0,
  scheduled: 1,
  sent: 2,
  cancelled: 3,
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground border-border",
  sent: "bg-primary/10 text-primary border-primary/20",
  cancelled: "badge-warning",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  sent: "Enviado",
  cancelled: "Cancelado",
  failed: "Falhou",
}

interface DayGroup {
  dayKey: string
  scheduledAt: Date
  anchorId: string
  totalRecipients: number
  totalResponses: number
  status: string
  statusCounts: Record<string, number>
  deptCount: number
}

function groupDispatchesByDay(dispatches: HealthSurveyDispatchWithConfig[], timezone: string): DayGroup[] {
  const buckets = new Map<string, DayGroup>()

  for (const d of dispatches) {
    const dayKey = formatInTimeZone(new Date(d.scheduledAt), timezone, "yyyy-MM-dd")
    const existing = buckets.get(dayKey)

    if (existing) {
      existing.totalRecipients += d.totalRecipients
      existing.totalResponses += d.totalResponses
      existing.deptCount += 1
      existing.statusCounts[d.status] = (existing.statusCounts[d.status] ?? 0) + 1
      const currentPriority = STATUS_PRIORITY[existing.status] ?? 3
      const newPriority = STATUS_PRIORITY[d.status] ?? 3
      if (newPriority < currentPriority) existing.status = d.status
    } else {
      buckets.set(dayKey, {
        dayKey,
        scheduledAt: new Date(d.scheduledAt),
        anchorId: d.id,
        totalRecipients: d.totalRecipients,
        totalResponses: d.totalResponses,
        status: d.status,
        statusCounts: { [d.status]: 1 },
        deptCount: 1,
      })
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  )
}

export default async function HealthSurveysListPage({ searchParams }: HealthSurveysListPageProps): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const statusFilter = params["status"]
  const dateFromStr = params["dateFrom"]
  const dateToStr = params["dateTo"]
  const pageParams = buildPaginationParams(params["page"], params["pageSize"])

  const org = await getOrganization(session.tenantId)
  const timezone = org?.timezone ?? "America/Sao_Paulo"

  const dateFrom = dateFromStr !== undefined ? fromZonedTime(new Date(`${dateFromStr}T00:00:00`), timezone) : undefined
  const dateTo = dateToStr !== undefined ? fromZonedTime(new Date(`${dateToStr}T23:59:59`), timezone) : undefined

  const dispatchQuery: { page: number; pageSize: number; status?: string; dateFrom?: Date; dateTo?: Date } = {
    page: pageParams.page,
    pageSize: pageParams.pageSize,
  }
  if (statusFilter !== undefined && statusFilter !== "all") dispatchQuery.status = statusFilter
  if (dateFrom !== undefined) dispatchQuery.dateFrom = dateFrom
  if (dateTo !== undefined) dispatchQuery.dateTo = dateTo

  const [{ items: pageDispatches, total }, configs] = await Promise.all([
    getHealthSurveyDispatchesPaginatedByDay(session.tenantId, dispatchQuery),
    getHealthSurveyConfigs(session.tenantId),
  ])

  const dayGroups = groupDispatchesByDay(pageDispatches, timezone)
  const hasAnyDispatches = total > 0

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Pesquisas</h1>
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">O que são as pesquisas?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Pesquisas rápidas e anônimas enviadas automaticamente para os colaboradores. Cada respondente avalia de 1 a 5 fatores como carga de trabalho, clima, reconhecimento e saúde emocional. Levam menos de 2 minutos para responder.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status de um disparo</p>
                  <ul className="text-[12px] text-foreground leading-relaxed space-y-1 list-none">
                    <li>🕐 <strong>Agendado</strong> — aguardando o horário de envio</li>
                    <li>✅ <strong>Enviado</strong> — mensagens disparadas; respostas sendo coletadas</li>
                    <li>❌ <strong>Falhou</strong> — erro no envio; verifique os alertas</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Taxa de adesão</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Percentual de colaboradores que responderam. Taxa abaixo de <strong>80%</strong> após 48h gera um alerta automático de baixa adesão. O RH pode reenviar o link para quem ainda não respondeu.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Anonimato garantido</p>
                  <p className="text-[12px] text-foreground leading-relaxed">As respostas <strong>não são vinculadas ao colaborador</strong>. O sistema exibe métricas por setor somente quando há 5 ou mais respondentes — nunca é possível identificar quem respondeu o quê.</p>
                </div>
              </div>
            } />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} {total === 1 ? "rodada" : "rodadas"}
          </p>        </div>
        <div className="flex gap-0">
          <Link
            href="/health-surveys/configure"
            className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            style={{ borderRadius: 0 }}
          >
            Configurar
          </Link>
          <ScheduleHealthSurveyDispatchButton hasConfigs={configs.length > 0} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {configs.length === 0 && (
          <div className="border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-3 mb-6">
            <span className="text-primary text-lg leading-none mt-0.5">ⓘ</span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Nenhuma pesquisa configurada</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure uma pesquisa para ao menos um departamento antes de agendar disparos.{" "}
                <Link href="/health-surveys/configure" className="text-primary hover:underline font-medium">
                  Configurar agora →
                </Link>
              </p>
            </div>
          </div>
        )}

        {configs.length > 0 && (
          <HealthSurveyListFilters filters={{
            ...(statusFilter !== undefined ? { status: statusFilter } : {}),
            ...(dateFromStr !== undefined ? { dateFrom: dateFromStr } : {}),
            ...(dateToStr !== undefined ? { dateTo: dateToStr } : {}),
          }} />
        )}

        {!hasAnyDispatches && configs.length > 0 && (
          <div className="border border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhuma pesquisa disparada ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Agende um disparo manual ou aguarde o envio automático.</p>
          </div>
        )}

        {dayGroups.length > 0 && (
          <DataTable
            columns={[
              { label: "Data" },
              { label: "Rodadas" },
              { label: "Status" },
              { label: "Respostas" },
              { label: "Adesão" },
              { label: "", className: "w-8" },
            ]}
            total={total}
            pagination={<TablePagination total={total} />}
            minWidth={760}
          >
            {dayGroups.map((g, i) => {
              const notResponded = Math.max(0, g.totalRecipients - g.totalResponses)
              const adherenceRate = g.totalRecipients > 0 ? g.totalResponses / g.totalRecipients : 0
              const adhPct = Math.round(adherenceRate * 100)

              return (
                <tr
                  key={g.dayKey}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors group ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/health-surveys/${g.anchorId}`} className="block font-mono text-xs text-foreground">
                      {formatInTimeZone(g.scheduledAt, timezone, "dd/MM/yyyy")}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/health-surveys/${g.anchorId}`} className="block text-xs text-muted-foreground">
                      {g.deptCount} {g.deptCount === 1 ? "rodada" : "rodadas"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/health-surveys/${g.anchorId}`} className="flex flex-wrap gap-1">
                      {Object.entries(g.statusCounts)
                        .sort(([a], [b]) => (STATUS_PRIORITY[a] ?? 3) - (STATUS_PRIORITY[b] ?? 3))
                        .map(([status, count]) => (
                          <span key={status} className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${STATUS_STYLE[status] ?? "bg-muted text-muted-foreground border-border"}`}>
                            {STATUS_LABELS[status] ?? status}{count > 1 ? ` ×${count}` : ""}
                          </span>
                        ))}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/health-surveys/${g.anchorId}`} className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-status-success" />
                        <span className="font-bold text-foreground">{g.totalResponses}</span>
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3 text-status-danger" />
                        <span className="font-bold text-foreground">{notResponded}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/health-surveys/${g.anchorId}`} className="block">
                      {g.totalRecipients > 0 ? (
                        <div className="flex flex-col gap-1 w-24">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Adesão</span>
                            <span className="text-[10px] font-bold">{adhPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all ${adherenceRateBarClass(adhPct)}`}
                              style={{ width: `${adhPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/health-surveys/${g.anchorId}`} className="block">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </DataTable>
        )}

      </div>
    </div>
  )
}
