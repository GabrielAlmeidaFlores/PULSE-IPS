import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getClimateSurveyDispatchesPaginated, type ClimateSurveyDispatchWithConfig } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { getClimateSurveyCampaignSetup } from "@/modules/climate-surveys/climate-survey-campaign.service"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { getOrganization } from "@/modules/organizations/organization.service"
import { ClimateSurveyListFilters } from "@/app/(tenant)/climate-surveys/climate-survey-list-filters"
import { CopyDispatchLinkButton } from "@/app/(tenant)/climate-surveys/components/copy-dispatch-link-button"
import { ClimateSurveyDispatchCampaignComposer } from "@/app/(tenant)/climate-surveys/dispatches/climate-survey-dispatch-campaign-composer"
import { adherenceRateBarClass } from "@/libs/utils/health-index"
import { DataTable, TablePagination } from "@/libs/design-system"
import { PageHelp } from "@/components/page-help"
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react"
import { env } from "@/env"
import { BADGE_AMBER, BADGE_BASE, BADGE_DEFAULT, BADGE_GREEN, BADGE_RED } from "@/libs/design-system/alert-labels"

interface ClimateSurveysListPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: BADGE_DEFAULT,
  available: BADGE_GREEN,
  cancelled: BADGE_AMBER,
  failed: BADGE_RED,
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  available: "Disponível",
  cancelled: "Cancelado",
  failed: "Falhou",
}

function buildDispatchRow(d: ClimateSurveyDispatchWithConfig): {
  totalRecipients: number
  totalResponses: number
  deptNames: string[]
} {
  return {
    totalRecipients: d.deptDispatches.reduce((sum, dd) => sum + dd.totalRecipients, 0),
    totalResponses: d.deptDispatches.reduce((sum, dd) => sum + dd.totalResponses, 0),
    deptNames: d.climateSurveyConfiguration.configDepartments.map((cd) => cd.department.name),
  }
}

export default async function ClimateSurveysListPage({ searchParams }: ClimateSurveysListPageProps): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard")

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

  const [campaignSetup, { items: dispatches, total }] = await Promise.all([
    getClimateSurveyCampaignSetup(session.tenantId),
    getClimateSurveyDispatchesPaginated(session.tenantId, dispatchQuery),
  ])

  const departmentNameById = new Map(campaignSetup.departments.map((d) => [d.id, d.name]))
  const configOptions = campaignSetup.configs.map((c) => ({
    id: c.id,
    name: c.name,
    departmentName: c.departmentIds
      .map((id) => departmentNameById.get(id))
      .filter((name): name is string => name !== undefined)
      .join(", "),
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <Link href="/climate-surveys" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Pesquisa de Clima</Link>
          <div className="flex items-center gap-1.5 mt-2">
            <h1 className="text-sm font-bold uppercase tracking-widest">Disparo & Canais</h1>
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Canal</p>
                  <p className="text-[12px] text-foreground leading-relaxed">
                    WhatsApp = envio automático para o colaborador.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Recorrência</p>
                  <p className="text-[12px] text-foreground leading-relaxed">
                    Pesquisa única não entra no auto-scheduler. Mensal, trimestral e semestral definem o intervalo entre ondas automáticas.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Lembrete 48h</p>
                  <p className="text-[12px] text-foreground leading-relaxed">
                    Ajusta a validade do link para permitir lembrete automático cerca de 48h após o disparo.
                  </p>
                </div>
              </div>
            } />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monte a campanha, selecione os departamentos e acompanhe o histórico de disparos
          </p>
        </div>
        <Link
          href="/climate-surveys/configure"
          className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-center"
          style={{ borderRadius: 0 }}
        >
          Banco de perguntas
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <ClimateSurveyDispatchCampaignComposer setup={campaignSetup} orgTimezone={timezone} />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Histórico de disparos ({total})
            </h2>
          </div>

          {campaignSetup.configs.length > 0 && (
            <ClimateSurveyListFilters
              filters={{
                ...(configIdFilter !== undefined ? { configId: configIdFilter } : {}),
                ...(statusFilter !== undefined ? { status: statusFilter } : {}),
                ...(dateFromStr !== undefined ? { dateFrom: dateFromStr } : {}),
                ...(dateToStr !== undefined ? { dateTo: dateToStr } : {}),
              }}
              configs={configOptions}
            />
          )}

          {total === 0 ? (
            <div className="border border-border bg-card px-5 py-8 text-center">
              <p className="text-sm font-bold text-muted-foreground">Nenhuma pesquisa disparada ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Use o compositor acima para enviar ou agendar a primeira campanha.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { label: "Data", className: "w-28" },
                { label: "Setores", className: "w-36" },
                { label: "Status", className: "w-32" },
                { label: "Respostas", className: "w-28" },
                { label: "Adesão", className: "w-32" },
                { label: "Link de acesso", className: "w-32 text-center" },
                { label: "", className: "w-8" },
              ]}
              total={total}
              pagination={<TablePagination total={total} />}
              minWidth={760}
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
                      <Link href={`/climate-surveys/${d.id}`} className="block">
                        <span className="font-mono text-xs text-foreground">
                          {formatInTimeZone(new Date(d.scheduledAt), timezone, "dd/MM/yyyy")}
                        </span>
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          {formatInTimeZone(new Date(d.scheduledAt), timezone, "HH:mm")}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 w-36">
                      <Link href={`/climate-surveys/${d.id}`} className="block">
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
                      <Link href={`/climate-surveys/${d.id}`} className="block">
                        <span className={`${BADGE_BASE} ${STATUS_STYLE[d.status] ?? BADGE_DEFAULT}`}>
                          {STATUS_LABELS[d.status] ?? d.status}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/climate-surveys/${d.id}`} className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-status-success" />
                          <span className="font-bold text-foreground">{totalResponses}</span>
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="h-3 w-3 text-status-danger" />
                          <span className="font-bold text-foreground">{notResponded}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/climate-surveys/${d.id}`} className="block">
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
                          groupLink={`${env.NEXT_PUBLIC_APP_URL}/climate-survey/link/${d.signedLinkToken}`}
                        />
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/climate-surveys/${d.id}`} className="block">
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
    </div>
  )
}
