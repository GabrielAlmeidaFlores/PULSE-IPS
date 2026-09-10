import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import { getGovernanceDashboard } from "@/modules/governance/governance.service"
import type { GovernanceWaveStatus } from "@/modules/governance/governance.types"
import { ChartCard } from "@/components/chart-card"
import { ClimateSurveyWaveEvolutionChart } from "@/app/(tenant)/climate-surveys/components/climate-survey-wave-evolution-chart"
import { WorkforceEvolutionChart } from "@/app/(tenant)/workforce/components/workforce-evolution-chart"
import { BADGE_BASE, BADGE_BLUE, BADGE_DEFAULT, BADGE_GREEN, BADGE_RED } from "@/libs/design-system/alert-labels"

const WAVE_STATUS_LABELS: Record<GovernanceWaveStatus, string> = {
  completed: "Concluída",
  scheduled: "Agendada",
  late: "Atrasada",
  failed: "Falhou",
  cancelled: "Cancelada",
}

const WAVE_STATUS_STYLES: Record<GovernanceWaveStatus, string> = {
  completed: BADGE_GREEN,
  scheduled: BADGE_BLUE,
  late: BADGE_RED,
  failed: BADGE_RED,
  cancelled: BADGE_DEFAULT,
}

type MetricTone = "default" | "success" | "warning" | "danger" | "info"

const METRIC_TONE_CLASSES: Record<MetricTone, string> = {
  default: "text-foreground",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
  info: "text-status-info",
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : value.toFixed(0)
}

function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
}

interface MetricCardProps {
  title: string
  value: string
  description: string
  tone?: MetricTone
}

function MetricCard({ title, value, description, tone = "default" }: MetricCardProps): React.ReactElement {
  return (
    <div className="border border-border bg-card px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className={`text-3xl font-bold tabular-nums mt-2 ${METRIC_TONE_CLASSES[tone]}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{description}</p>
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  description: string
}

function SectionHeader({ title, description }: SectionHeaderProps): React.ReactElement {
  return (
    <div className="border-l-2 border-primary pl-3">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground">{title}</h2>
      <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
    </div>
  )
}

export default async function GovernancePage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const [dashboard, org, hasClimateSurveys] = await Promise.all([
    getGovernanceDashboard(session.tenantId),
    getOrganization(session.tenantId),
    hasTenantPlanFeature(session.tenantId, "climate_surveys"),
  ])
  const timezone = org?.timezone ?? "America/Sao_Paulo"

  const climate = dashboard.climate
  const climateWaveLabel =
    climate.waveConfigName !== null && climate.waveScheduledAt !== null
      ? `${climate.waveConfigName} · ${formatDate(climate.waveScheduledAt, timezone)}`
      : null

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest">Governança</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Painel macro para gestores: clima, engajamento, riscos, planos de ação e indicadores de equipe
            </p>
          </div>
          {hasClimateSurveys && (
            <Link
              href="/climate-surveys/compare"
              className="shrink-0 px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              style={{ borderRadius: 0 }}
            >
              Comparar ondas
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <section className="space-y-3">
          <SectionHeader
            title="Clima organizacional"
            description="Resultados da pesquisa de clima mais recente e a evolução entre as ondas. Métricas ocultadas quando a participação fica abaixo do mínimo de anonimato."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <MetricCard
              title="Adesão"
              value={formatPercent(climate.adherencePercent)}
              description="Percentual de colaboradores que responderam a última pesquisa em relação aos convidados."
            />
            <MetricCard
              title="Favorabilidade"
              value={formatPercent(climate.favorabilityPercent)}
              description="Percentual de respostas positivas (notas 4 e 5) na última onda."
            />
            <MetricCard
              title="Índice de clima"
              value={formatPercent(climate.scorePercent)}
              description="Índice geral ponderado de clima da última onda (0 a 100%)."
            />
            <MetricCard
              title="eNPS"
              value={formatNumber(climate.enps)}
              description="Índice de recomendação dos colaboradores: % de promotores menos % de detratores (−100 a +100)."
              tone={climate.enps !== null && climate.enps < 0 ? "danger" : "success"}
            />
            <MetricCard
              title="Respostas"
              value={String(climate.totalResponses)}
              description="Total de respostas recebidas na última onda."
            />
            <MetricCard
              title="Convidados"
              value={String(climate.totalRecipients)}
              description="Total de colaboradores convidados a responder na última onda."
            />
          </div>
          {climateWaveLabel !== null && (
            <p className="text-[11px] text-muted-foreground">
              Onda de referência: <span className="text-foreground">{climateWaveLabel}</span>
            </p>
          )}
          {climate.evolution.length > 0 ? (
            <ChartCard
              title="Evolução do clima entre ondas"
              subtitle="Adesão, favorabilidade, índice de clima e eNPS por onda"
            >
              <ClimateSurveyWaveEvolutionChart points={climate.evolution} corporateGoalPercent={climate.corporateGoalPercent} />
            </ChartCard>
          ) : (
            <div className="border border-dashed border-border bg-card px-5 py-8 text-center">
              <p className="text-sm font-bold text-muted-foreground">Sem histórico de ondas de clima</p>
              <p className="text-xs text-muted-foreground mt-1">Dispare uma pesquisa de clima para acompanhar a evolução.</p>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Riscos e alertas"
            description="Alertas automáticos gerados a partir das respostas das pesquisas (índice baixo, quedas, tendência negativa, adesão baixa e relatos de crise)."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              title="Alertas abertos"
              value={String(dashboard.alerts.unresolved)}
              description="Alertas ainda não resolvidos que exigem atenção do gestor."
              tone={dashboard.alerts.unresolved > 0 ? "warning" : "default"}
            />
            <MetricCard
              title="Alertas críticos"
              value={String(dashboard.alerts.criticalUnresolved)}
              description="Alertas abertos de severidade crítica (prioridade máxima)."
              tone={dashboard.alerts.criticalUnresolved > 0 ? "danger" : "default"}
            />
            <MetricCard
              title="Alertas resolvidos"
              value={String(dashboard.alerts.resolved)}
              description="Alertas já tratados e encerrados."
              tone="success"
            />
            <MetricCard
              title="Alertas no total"
              value={String(dashboard.alerts.total)}
              description="Total de alertas gerados desde o início do monitoramento."
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Planos de ação"
            description="Acompanhamento dos planos de ação criados pelo RH (manualmente ou a partir de insights de IA)."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <MetricCard
              title="Taxa de conclusão"
              value={formatPercent(dashboard.actionPlans.completionRatePercent)}
              description="Percentual de planos concluídos em relação ao total criado."
              tone="success"
            />
            <MetricCard
              title="Abertos"
              value={String(dashboard.actionPlans.open)}
              description="Planos criados e ainda não iniciados."
            />
            <MetricCard
              title="Em andamento"
              value={String(dashboard.actionPlans.inProgress)}
              description="Planos em execução neste momento."
              tone="warning"
            />
            <MetricCard
              title="Concluídos"
              value={String(dashboard.actionPlans.completed)}
              description="Planos finalizados."
              tone="success"
            />
            <MetricCard
              title="Atrasados"
              value={String(dashboard.actionPlans.overdue)}
              description="Planos com prazo vencido e ainda não concluídos."
              tone={dashboard.actionPlans.overdue > 0 ? "danger" : "default"}
            />
            <MetricCard
              title="Total"
              value={String(dashboard.actionPlans.total)}
              description="Total de planos de ação registrados."
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Métricas de equipe"
            description={
              dashboard.workforce.competencia !== null
                ? `Indicadores de colaboradores, movimentação e absenteísmo da competência ${dashboard.workforce.competencia}.`
                : "Indicadores de colaboradores, movimentação e absenteísmo. Importe a base mensal para visualizar."
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <MetricCard
              title="Colaboradores"
              value={String(dashboard.workforce.headcount)}
              description="Colaboradores ativos na competência."
            />
            <MetricCard
              title="Admissões"
              value={String(dashboard.workforce.admissions)}
              description="Colaboradores admitidos na competência."
              tone="info"
            />
            <MetricCard
              title="Desligamentos"
              value={String(dashboard.workforce.terminations)}
              description="Colaboradores desligados na competência."
              tone="warning"
            />
            <MetricCard
              title="Rotatividade"
              value={formatPercent(dashboard.workforce.turnoverPercent)}
              description="Desligamentos divididos pelo total de colaboradores no período."
              tone={dashboard.workforce.turnoverPercent !== null && dashboard.workforce.turnoverPercent >= 10 ? "danger" : "default"}
            />
            <MetricCard
              title="Absenteísmo"
              value={formatPercent(dashboard.workforce.absenteeismPercent)}
              description="Horas ausentes (justificadas e injustificadas) sobre as horas previstas."
              tone={dashboard.workforce.absenteeismPercent !== null && dashboard.workforce.absenteeismPercent >= 8 ? "danger" : "default"}
            />
          </div>
          {dashboard.workforce.evolution.length > 0 ? (
            <ChartCard
              title="Evolução das métricas de equipe"
              subtitle="Colaboradores, rotatividade e absenteísmo por competência"
            >
              <WorkforceEvolutionChart points={dashboard.workforce.evolution} />
            </ChartCard>
          ) : (
            <div className="border border-dashed border-border bg-card px-5 py-8 text-center">
              <p className="text-sm font-bold text-muted-foreground">Sem dados de equipe importados</p>
              <p className="text-xs text-muted-foreground mt-1">Importe a base mensal em Métricas de Equipe para acompanhar a evolução.</p>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Roadmap de pesquisas de clima"
            description="Ondas agendadas, concluídas e atrasadas. Use o status para identificar pesquisas que precisam de atenção."
          />
          <div className="border border-border bg-card overflow-hidden">
            {dashboard.timeline.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-bold text-muted-foreground">Nenhuma pesquisa agendada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pesquisa</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32">Agendada para</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.timeline.map((wave, index) => (
                      <tr
                        key={wave.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${index % 2 !== 0 ? "bg-muted/10" : ""}`}
                      >
                        <td className="px-4 py-3 text-xs font-medium text-foreground">{wave.configName}</td>
                        <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatDate(wave.scheduledAt, timezone)}</td>
                        <td className="px-4 py-3">
                          <span className={`${BADGE_BASE} ${WAVE_STATUS_STYLES[wave.status]}`}>
                            {WAVE_STATUS_LABELS[wave.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
