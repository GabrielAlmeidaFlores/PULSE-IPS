import Link from "next/link"
import { redirect } from "next/navigation"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { CheckCircle2, ChevronRight, Users, XCircle } from "lucide-react"
import { env } from "@/env"
import { DataTable, TablePagination } from "@/libs/design-system"
import { adherenceRateBarClass } from "@/libs/utils/health-index"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { getSession } from "@/modules/auth/session"
import { getHealthSurveyConfigs } from "@/modules/health-surveys/health-survey-config.service"
import { getHealthSurveyDispatchesPaginated, type HealthSurveyDispatchWithConfig } from "@/modules/health-surveys/health-survey-dashboard.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import { ScheduleHealthSurveyDispatchButton } from "@/app/(tenant)/health-surveys/schedule-health-survey-dispatch-button"
import { CopyDispatchLinkButton } from "@/app/(tenant)/health-surveys/components/copy-dispatch-link-button"
import { HealthSurveyListFilters } from "@/app/(tenant)/health-surveys/health-survey-list-filters"
import { PageHelp } from "@/components/page-help"

interface HealthSurveysListPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground border-border",
  available: "bg-primary/10 text-primary border-primary/20",
  cancelled: "badge-warning",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  available: "Disponível",
  cancelled: "Cancelado",
  failed: "Falhou",
}

function buildDispatchRow(d: HealthSurveyDispatchWithConfig): {
  totalRecipients: number
  totalResponses: number
  deptNames: string[]
} {
  return {
    totalRecipients: d.deptDispatches.reduce((sum, dd) => sum + dd.totalRecipients, 0),
    totalResponses: d.deptDispatches.reduce((sum, dd) => sum + dd.totalResponses, 0),
    deptNames: d.healthSurveyConfiguration.configDepartments.map((cd) => cd.department.name),
  }
}

export default async function HealthSurveysListPage({ searchParams }: HealthSurveysListPageProps): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const statusFilter = params["status"]
  const dateFromStr = params["dateFrom"]
  const dateToStr = params["dateTo"]
  const configIdFilter = params["configId"]
  const pageParams = buildPaginationParams(params["page"], params["pageSize"])

  const org = await getOrganization(session.tenantId)
  const timezone = org?.timezone ?? "America/Sao_Paulo"

  const dateFrom = dateFromStr !== undefined ? fromZonedTime(new Date(`${dateFromStr}T00:00:00`), timezone) : undefined
  const dateTo = dateToStr !== undefined ? fromZonedTime(new Date(`${dateToStr}T23:59:59`), timezone) : undefined

  const dispatchQuery: { page: number; pageSize: number; status?: string; dateFrom?: Date; dateTo?: Date; configId?: string } = {
    page: pageParams.page,
    pageSize: pageParams.pageSize,
  }
  if (statusFilter !== undefined && statusFilter !== "all") dispatchQuery.status = statusFilter
  if (dateFrom !== undefined) dispatchQuery.dateFrom = dateFrom
  if (dateTo !== undefined) dispatchQuery.dateTo = dateTo
  if (configIdFilter !== undefined && configIdFilter !== "all") dispatchQuery.configId = configIdFilter

  const [{ items: dispatches, total }, configs] = await Promise.all([
    getHealthSurveyDispatchesPaginated(session.tenantId, dispatchQuery),
    getHealthSurveyConfigs(session.tenantId),
  ])

  const hasAnyDispatches = total > 0

  const configOptions = configs.map((c) => ({
    id: c.id,
    name: c.name,
    departmentName: c.configDepartments.map((cd) => cd.department.name).join(", "),
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
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
                    <li>✅ <strong>Disponível</strong> — pesquisa liberada; respostas sendo coletadas</li>
                    <li>❌ <strong>Falhou</strong> — erro no envio; verifique os alertas</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Taxa de adesão</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Percentual de destinatários elegíveis que responderam. A tabela mostra separadamente quem respondeu, quem ainda não respondeu e o total de destinatários elegíveis.</p>
                  <p className="text-[12px] text-foreground leading-relaxed mt-1">São elegíveis os colaboradores ativos, vinculados aos setores da pesquisa, considerados pela programação de jornada e que não recusaram ou saíram da pesquisa. Por isso, esse total pode variar entre disparos.</p>
                  <p className="text-[12px] text-foreground leading-relaxed mt-1">Taxa abaixo de <strong>80%</strong> após 48h gera um alerta automático de baixa adesão. O RH pode reenviar o link para quem ainda não respondeu.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Anonimato garantido</p>
                  <p className="text-[12px] text-foreground leading-relaxed">As respostas <strong>não são vinculadas ao colaborador</strong>. O sistema exibe métricas por setor somente quando há 5 ou mais respondentes — nunca é possível identificar quem respondeu o quê.</p>
                </div>
              </div>
            } />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} {total === 1 ? "disparo" : "disparos"}
          </p>
        </div>
        <div className="flex gap-0 w-full sm:w-auto">
          <Link
            href="/health-surveys/configure"
            className="flex-1 sm:flex-none px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-center"
            style={{ borderRadius: 0 }}
          >
            Configurar
          </Link>
          <ScheduleHealthSurveyDispatchButton
            hasConfigs={configs.length > 0}
            configs={configOptions}
            orgTimezone={timezone}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">

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
          <HealthSurveyListFilters
            filters={{
              ...(configIdFilter !== undefined ? { configId: configIdFilter } : {}),
              ...(statusFilter !== undefined ? { status: statusFilter } : {}),
              ...(dateFromStr !== undefined ? { dateFrom: dateFromStr } : {}),
              ...(dateToStr !== undefined ? { dateTo: dateToStr } : {}),
            }}
            configs={configOptions}
          />
        )}

        {!hasAnyDispatches && configs.length > 0 && (
          <div className="border border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhuma pesquisa disparada ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Agende um disparo manual ou aguarde o envio automático.</p>
          </div>
        )}

        {dispatches.length > 0 && (
          <DataTable
            columns={[
              { label: "Data", className: "w-28" },
              { label: "Setores", className: "w-36" },
              { label: "Status", className: "w-32" },
              { label: "Participação", className: "w-44" },
              { label: "Adesão", className: "w-32" },
              { label: "Link de acesso", className: "w-32 text-center" },
              { label: "", className: "w-8" },
            ]}
            total={total}
            pagination={<TablePagination total={total} />}
            minWidth={900}
          >
            {dispatches.map((d, i) => {
              const { totalRecipients, totalResponses, deptNames } = buildDispatchRow(d)
              const notResponded = Math.max(0, totalRecipients - totalResponses)
              const adherenceRate = totalRecipients > 0 ? totalResponses / totalRecipients : 0
              const adhPct = Math.round(adherenceRate * 100)

              return (
                <tr
                  key={d.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors group ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/health-surveys/${d.id}`} className="block">
                      <span className="font-mono text-xs text-foreground">
                        {formatInTimeZone(new Date(d.scheduledAt), timezone, "dd/MM/yyyy")}
                      </span>
                      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {formatInTimeZone(new Date(d.scheduledAt), timezone, "HH:mm")}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 w-36">
                    <Link href={`/health-surveys/${d.id}`} className="block">
                      <span className="text-xs text-muted-foreground">
                        {deptNames.length} {deptNames.length === 1 ? "setor" : "setores"}
                      </span>
                      {deptNames.length > 0 && (
                        <div className="mt-0.5">
                          <span className="text-[9px] font-medium text-muted-foreground/70">
                            {deptNames.join(", ")}
                          </span>
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/health-surveys/${d.id}`} className="block">
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${STATUS_STYLE[d.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                        {STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/health-surveys/${d.id}`} className="flex flex-col items-start gap-1 text-[11px]">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-status-success" />
                        <span>Respondidas:</span>
                        <span className="font-bold text-foreground">{totalResponses}</span>
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3 text-status-danger" />
                        <span>Não respondidas:</span>
                        <span className="font-bold text-foreground">{notResponded}</span>
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>Destinatários elegíveis:</span>
                        <span className="font-bold text-foreground">{totalRecipients}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/health-surveys/${d.id}`} className="block">
                      {totalRecipients > 0 ? (
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
                  <td className="px-3 py-3 text-center">
                    {d.signedLinkToken !== null ? (
                      <CopyDispatchLinkButton
                        groupLink={`${env.NEXT_PUBLIC_APP_URL}/health-survey/link/${d.signedLinkToken}`}
                      />
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/health-surveys/${d.id}`} className="block">
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
