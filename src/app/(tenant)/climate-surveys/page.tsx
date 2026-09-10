import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getClimateSurveyModuleDashboard } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { getClimateSurveyConfigs } from "@/modules/climate-surveys/climate-survey-config.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import { getActiveDepartments } from "@/modules/departments/department.service"
import { formatInTimeZone } from "date-fns-tz"
import { ChartCard } from "@/components/chart-card"
import { PageHelp } from "@/components/page-help"
import { FilterBar } from "@/libs/design-system"
import { ClimateSurveyTopicRadarChart } from "@/app/(tenant)/climate-surveys/components/climate-survey-topic-radar-chart"
import { ClimateSurveyWaveEvolutionChart } from "@/app/(tenant)/climate-surveys/components/climate-survey-wave-evolution-chart"
import { ClimateSurveyEnpsDonutChart } from "@/app/(tenant)/climate-surveys/components/climate-survey-enps-donut-chart"
import { ClimateSurveyTopicDepartmentHeatmap } from "@/app/(tenant)/climate-surveys/components/climate-survey-topic-department-heatmap"
import { ClimateSurveyDisplaySettingsButton } from "@/app/(tenant)/climate-surveys/climate-survey-display-settings-button"
import type { ClimateSurveyMetricStatus } from "@/modules/climate-surveys/climate-survey.types"
import { CLIMATE_SURVEY_MIN_RESPONDENTS_FLOOR } from "@/libs/utils/anonymity"

function kpiToneClass(status: ClimateSurveyMetricStatus): string {
  if (status === "above_goal") return "border-status-success-border bg-status-success-subtle"
  if (status === "attention") return "border-status-warning-border bg-status-warning-subtle"
  if (status === "critical") return "border-status-danger-border bg-status-danger-subtle"
  return "border-border bg-card"
}

function kpiValueClass(status: ClimateSurveyMetricStatus): string {
  if (status === "above_goal") return "text-status-success"
  if (status === "attention") return "text-status-warning"
  if (status === "critical") return "text-status-danger"
  return "text-foreground"
}

function formatKpi(value: number | null, suffix = ""): string {
  if (value === null) return "—"
  return `${value}${suffix}`
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function computeDelta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null
  return roundOneDecimal(current - previous)
}

function deltaLabel(delta: number | null): string {
  if (delta === null) return "sem onda anterior"
  if (delta === 0) return "→ 0.0 pp vs. onda anterior"
  const sign = delta > 0 ? "+" : ""
  return `${delta > 0 ? "▲" : "▼"} ${sign}${delta.toFixed(1)} pp vs. onda anterior`
}

function deltaClass(delta: number | null): string {
  if (delta === null || delta === 0) return "text-muted-foreground"
  return delta > 0 ? "text-status-success" : "text-status-danger"
}

function topicsBelowGoalClass(below: number, total: number): string {
  if (below === 0) return "text-status-success"
  if (total > 0 && below / total > 0.5) return "text-status-danger"
  return "text-status-warning"
}

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function ClimateSurveyDashboardPage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard")

  const params = await searchParams
  const departmentId = params["department"]

  const [dashboard, configs, org, departments] = await Promise.all([
    getClimateSurveyModuleDashboard(session.tenantId, departmentId),
    getClimateSurveyConfigs(session.tenantId),
    getOrganization(session.tenantId),
    getActiveDepartments(session.tenantId),
  ])

  const timezone = org?.timezone ?? "America/Sao_Paulo"
  const wave = dashboard.wave
  const selectedDepartment = departmentId !== undefined ? departments.find((department) => department.id === departmentId) : undefined

  const evolution = dashboard.evolution
  const currentEvolution = evolution[evolution.length - 1]
  const previousEvolution = evolution.length > 1 ? evolution[evolution.length - 2] : undefined
  const favorabilityDelta = computeDelta(currentEvolution?.favorabilityPercent, previousEvolution?.favorabilityPercent)
  const enpsDelta = computeDelta(currentEvolution?.enps, previousEvolution?.enps)
  const adherenceDelta = computeDelta(currentEvolution?.adherencePercent, previousEvolution?.adherencePercent)
  const topicsTotal = dashboard.radar.length
  const topicsBelowGoal = dashboard.radar.filter(
    (topic) => topic.scorePercent !== null && topic.scorePercent < dashboard.corporateGoalPercent,
  ).length

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-sm font-bold uppercase tracking-widest">Painel — Pesquisa de Clima</h1>
              <PageHelp
                content={
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">KPIs</p>
                      <p className="text-[12px] text-foreground leading-relaxed">
                        Adesão = respondentes / destinatários. Favorabilidade = (Concordo + Concordo Totalmente) / total × 100. Índice de clima = média dos pesos Likert (1.0 / 0.8 / 0.6 / 0.4 / 0.2) × 100. eNPS = % promotores − % detratores (nota 0–10: 9–10 / 7–8 / 0–6).
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Cores</p>
                      <p className="text-[12px] text-foreground leading-relaxed">
                        Verde: acima da meta. Amarelo: atenção. Vermelho: crítico. Meta corporativa padrão: {dashboard.corporateGoalPercent}%.
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Anonimato</p>
                      <p className="text-[12px] text-foreground leading-relaxed">
                        Scores e favorabilidade só aparecem ao atingir {dashboard.minRespondentsPercent}% de participação (mínimo de {CLIMATE_SURVEY_MIN_RESPONDENTS_FLOOR} respondentes).
                      </p>
                    </div>
                  </div>
                }
              />
            </div>
            {wave !== null ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Última onda ativa: <span className="text-foreground font-medium">{wave.configName}</span>
                {" · "}
                {formatInTimeZone(wave.dispatchedAt ?? wave.scheduledAt, timezone, "dd/MM/yyyy HH:mm")}
                {wave.departmentNames.length > 0 ? ` · ${wave.departmentNames.join(", ")}` : null}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Nenhuma onda ativa no momento</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {session.role === "admin" && (
              <ClimateSurveyDisplaySettingsButton minRespondentsPercent={dashboard.minRespondentsPercent} />
            )}
            <Link
              href="/climate-surveys/compare"
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-center"
              style={{ borderRadius: 0 }}
            >
              Comparar ondas
            </Link>
            {wave !== null && (
              <Link
                href={`/climate-surveys/${wave.id}`}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-center"
                style={{ borderRadius: 0 }}
              >
                Ver onda
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {departments.length > 0 && (
          <div className="space-y-2">
            <FilterBar
              fields={[
                {
                  type: "select",
                  key: "department",
                  label: "Visão",
                  width: "w-[240px]",
                  options: departments.map((department) => ({ value: department.id, label: department.name })),
                  allLabel: "Empresa toda",
                },
              ]}
              values={{ ...(departmentId !== undefined ? { department: departmentId } : {}) }}
            />
            {selectedDepartment !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-primary/30 bg-primary/10 text-primary">
                Área: {selectedDepartment.name}
                <Link href="/climate-surveys" aria-label="Remover filtro de área" className="hover:text-foreground">
                  ×
                </Link>
              </span>
            )}
          </div>
        )}
        {wave === null ? (
          <div className="border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Sem dados de clima para exibir</p>
            <p className="text-xs text-muted-foreground mt-1">
              {configs.length === 0
                ? "Configure o banco de perguntas e dispare a primeira onda."
                : "Agende um disparo em Disparo & Canais para gerar o dashboard."}
            </p>
            <Link
              href={configs.length === 0 ? "/climate-surveys/configure/new" : "/climate-surveys/dispatches"}
              className="inline-block mt-4 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              style={{ borderRadius: 0 }}
            >
              {configs.length === 0 ? "Configurar agora" : "Ir para disparos"}
            </Link>
          </div>
        ) : (
          <>
            {dashboard.kpis.totalRecipients > 0 && !dashboard.hasEnoughRespondents && (
              <div className="border border-status-warning-border bg-status-warning-subtle px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-status-warning">Respondentes insuficientes</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Favorabilidade, eNPS, radar e mapa de calor ficam ocultos até haver pelo menos {dashboard.requiredRespondents} respostas na onda (mínimo de {dashboard.minRespondentsPercent}% de participação).
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className={`border px-4 py-4 ${kpiToneClass(dashboard.kpis.favorabilityStatus)}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Favorabilidade</p>
                <p className={`text-3xl font-bold tabular-nums mt-2 ${kpiValueClass(dashboard.kpis.favorabilityStatus)}`}>
                  {formatKpi(dashboard.kpis.favorabilityPercent, "%")}
                </p>
                <p className={`text-[11px] mt-1 ${deltaClass(favorabilityDelta)}`}>{deltaLabel(favorabilityDelta)}</p>
              </div>
              <div className={`border px-4 py-4 ${kpiToneClass(dashboard.kpis.enpsStatus)}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">eNPS</p>
                <p className={`text-3xl font-bold tabular-nums mt-2 ${kpiValueClass(dashboard.kpis.enpsStatus)}`}>
                  {formatKpi(dashboard.kpis.enps)}
                </p>
                <p className={`text-[11px] mt-1 ${deltaClass(enpsDelta)}`}>{deltaLabel(enpsDelta)}</p>
              </div>
              <div className={`border px-4 py-4 ${kpiToneClass(dashboard.kpis.adherenceStatus)}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão</p>
                <p className={`text-3xl font-bold tabular-nums mt-2 ${kpiValueClass(dashboard.kpis.adherenceStatus)}`}>
                  {formatKpi(dashboard.kpis.adherencePercent, "%")}
                </p>
                <p className={`text-[11px] mt-1 ${deltaClass(adherenceDelta)}`}>{deltaLabel(adherenceDelta)}</p>
              </div>
              <div className={`border px-4 py-4 ${topicsBelowGoal === 0 ? "border-status-success-border bg-status-success-subtle" : "border-border bg-card"}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tópicos abaixo da meta</p>
                <p className={`text-3xl font-bold tabular-nums mt-2 ${topicsBelowGoalClass(topicsBelowGoal, topicsTotal)}`}>
                  {topicsBelowGoal} de {topicsTotal}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">meta de {dashboard.corporateGoalPercent}%</p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              {dashboard.kpis.totalResponses} respostas de {dashboard.kpis.totalRecipients} convidados nesta onda
            </p>

            <div className="border border-border bg-card px-4 py-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funil da onda</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Abertura, clique, início e conclusão da participação
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Taxa de abertura</p>
                  <p className="text-xl font-bold tabular-nums mt-1">{formatKpi(dashboard.funnel.openRatePercent, "%")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Taxa de clique</p>
                  <p className="text-xl font-bold tabular-nums mt-1">{formatKpi(dashboard.funnel.clickRatePercent, "%")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Taxa de início</p>
                  <p className="text-xl font-bold tabular-nums mt-1">{formatKpi(dashboard.funnel.startRatePercent, "%")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Taxa de conclusão</p>
                  <p className="text-xl font-bold tabular-nums mt-1">{formatKpi(dashboard.funnel.completionRatePercent, "%")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tempo médio</p>
                  <p className="text-xl font-bold tabular-nums mt-1">
                    {dashboard.funnel.averageResponseTimeSeconds === null
                      ? "—"
                      : `${Math.round(dashboard.funnel.averageResponseTimeSeconds / 60)} min`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Abandonos</p>
                  <p className="text-xl font-bold tabular-nums mt-1">
                    {dashboard.funnel.abandonmentByQuestion.reduce((sum, row) => sum + row.abandonedCount, 0)}
                  </p>
                </div>
              </div>
              {dashboard.funnel.abandonmentByQuestion.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Abandono por pergunta
                  </p>
                  <ul className="space-y-1">
                    {dashboard.funnel.abandonmentByQuestion.map((row) => (
                      <li
                        key={`${String(row.questionOrder)}-${row.questionId ?? "none"}`}
                        className="text-xs text-muted-foreground flex justify-between gap-3"
                      >
                        <span>
                          {row.questionOrder === null
                            ? "Antes da 1ª pergunta"
                            : `Pergunta ${row.questionOrder}`}
                        </span>
                        <span className="tabular-nums text-foreground">
                          {row.abandonedCount}
                          {row.abandonmentPercentOfStarts !== null
                            ? ` (${row.abandonmentPercentOfStarts}%)`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ChartCard
                title="Radar por tópico"
                subtitle={`Comparação com a meta corporativa (${dashboard.corporateGoalPercent}%)`}
              >
                <ClimateSurveyTopicRadarChart
                  points={dashboard.radar}
                  corporateGoalPercent={dashboard.corporateGoalPercent}
                />
              </ChartCard>
              <ChartCard title="eNPS" subtitle="Distribuição de promotores, neutros e detratores">
                <ClimateSurveyEnpsDonutChart breakdown={dashboard.enpsBreakdown} />
              </ChartCard>
            </div>

            <ChartCard title="Evolução entre ondas" subtitle="Clima, favorabilidade, adesão e eNPS ao longo do tempo">
              <ClimateSurveyWaveEvolutionChart
                points={dashboard.evolution}
                corporateGoalPercent={dashboard.corporateGoalPercent}
              />
            </ChartCard>

            <ChartCard
              title="Mapa de calor tópicos × departamentos"
              subtitle="Verde: acima da meta · Amarelo: atenção · Vermelho: crítico"
            >
              <ClimateSurveyTopicDepartmentHeatmap heatmap={dashboard.heatmap} />
            </ChartCard>
          </>
        )}
      </div>
    </div>
  )
}
