import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import { getGovernanceDashboard } from "@/modules/governance/governance.service"
import type { GovernanceWaveStatus } from "@/modules/governance/governance.types"
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

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : value.toFixed(0)
}

function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
}

interface KpiCardProps {
  label: string
  value: string
  hint: string
  tone?: "default" | "success" | "warning" | "danger"
}

const KPI_TONE_CLASSES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
}

function KpiCard({ label, value, hint, tone = "default" }: KpiCardProps): React.ReactElement {
  const toneClass = KPI_TONE_CLASSES[tone]
  return (
    <div className="border border-border bg-card px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold tabular-nums mt-2 ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest">Governança</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visão macro do clima, pessoas, alertas e planos de ação
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

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Pesquisa de clima · última onda
            {dashboard.climate.waveConfigName !== null && dashboard.climate.waveScheduledAt !== null
              ? ` · ${dashboard.climate.waveConfigName} (${formatDate(dashboard.climate.waveScheduledAt, timezone)})`
              : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard label="Adesão" value={formatPercent(dashboard.climate.adherencePercent)} hint="participação na última onda" />
            <KpiCard label="Favorabilidade" value={formatPercent(dashboard.climate.favorabilityPercent)} hint="respostas 4–5" />
            <KpiCard label="eNPS" value={formatNumber(dashboard.climate.enps)} hint="promotores − detratores" />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Riscos e ações</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            <KpiCard
              label="Alertas abertos"
              value={String(dashboard.alerts.unresolved)}
              hint="não resolvidos"
              tone={dashboard.alerts.unresolved > 0 ? "warning" : "default"}
            />
            <KpiCard
              label="Alertas críticos"
              value={String(dashboard.alerts.criticalUnresolved)}
              hint="severidade crítica"
              tone={dashboard.alerts.criticalUnresolved > 0 ? "danger" : "default"}
            />
            <KpiCard label="Planos em andamento" value={String(dashboard.actionPlans.inProgress)} hint="em execução" tone="warning" />
            <KpiCard label="Planos concluídos" value={String(dashboard.actionPlans.completed)} hint="finalizados" tone="success" />
            <KpiCard
              label="Planos atrasados"
              value={String(dashboard.actionPlans.overdue)}
              hint="prazo vencido"
              tone={dashboard.actionPlans.overdue > 0 ? "danger" : "default"}
            />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Indicadores de pessoas
            {dashboard.workforce.competencia !== null ? ` · competência ${dashboard.workforce.competencia}` : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard label="Headcount" value={String(dashboard.workforce.headcount)} hint="colaboradores ativos" />
            <KpiCard label="Turnover" value={formatPercent(dashboard.workforce.turnoverPercent)} hint="desligamentos / headcount" />
            <KpiCard label="Absenteísmo" value={formatPercent(dashboard.workforce.absenteeismPercent)} hint="horas ausentes / previstas" />
          </div>
        </div>

        <div className="border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Roadmap de pesquisas de clima
            </p>
          </div>
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
      </div>
    </div>
  )
}
