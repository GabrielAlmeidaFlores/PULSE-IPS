import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import {
  getClimateSurveyWaveComparison,
  type ClimateSurveyComparisonHighlight,
  type ClimateSurveyDepartmentComparison,
  type ClimateSurveyMetricComparison,
  type ClimateSurveyTopicComparison,
} from "@/modules/climate-surveys/climate-survey-comparison.service"
import { ClimateSurveyWaveComparisonChart } from "@/app/(tenant)/climate-surveys/compare/climate-survey-wave-comparison-chart"
import { ClimateSurveyWaveComparisonFilters } from "@/app/(tenant)/climate-surveys/compare/climate-survey-wave-comparison-filters"
import { ChartCard } from "@/components/chart-card"
import { BADGE_AMBER, BADGE_BASE, BADGE_BLUE, BADGE_RED } from "@/libs/design-system/alert-labels"
import {
  CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
  CLIMATE_SURVEY_READING_PILL_LABELS,
  type ClimateSurveyReadingPill,
} from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

function formatWaveLabel(configName: string, scheduledAt: Date, timezone: string): string {
  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(scheduledAt)
  return `${configName} · ${date}`
}

function formatMetricValue(value: number | null, unit: ClimateSurveyMetricComparison["unit"]): string {
  if (value === null) return "—"
  if (unit === "percent") return `${value.toFixed(1)}%`
  if (unit === "count") return String(Math.round(value))
  return value.toFixed(1)
}

function formatMetricDelta(delta: number | null, unit: ClimateSurveyMetricComparison["unit"]): string {
  if (delta === null) return "—"
  const sign = delta > 0 ? "+" : ""
  if (unit === "percent") return `${sign}${delta.toFixed(1)} p.p.`
  if (unit === "count") return `${sign}${Math.round(delta)}`
  return `${sign}${delta.toFixed(1)} pts`
}

function metricDeltaClass(delta: number | null, higherIsBetter: boolean): string {
  if (delta === null || delta === 0) return "text-muted-foreground"
  const improved = higherIsBetter ? delta > 0 : delta < 0
  return improved ? "text-status-success" : "text-status-danger"
}

function formatPercentValue(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`
}

function formatPercentDelta(delta: number | null): string {
  if (delta === null) return "—"
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta.toFixed(1)} p.p.`
}

function deltaClass(delta: number | null): string {
  if (delta === null || delta === 0) return "text-muted-foreground"
  return delta > 0 ? "text-status-success" : "text-status-danger"
}

function readingPillClass(reading: ClimateSurveyReadingPill): string {
  if (reading === "critical") return BADGE_RED
  if (reading === "attention") return BADGE_AMBER
  return BADGE_BLUE
}

function ReadingPill({ reading }: { reading: ClimateSurveyReadingPill | null }): React.ReactElement {
  if (reading === null) return <span className="text-xs text-muted-foreground">—</span>
  return <span className={`${BADGE_BASE} ${readingPillClass(reading)}`}>{CLIMATE_SURVEY_READING_PILL_LABELS[reading]}</span>
}

function HighlightList({ highlights }: { highlights: ClimateSurveyComparisonHighlight[] }): React.ReactElement {
  if (highlights.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Sem variações nesta comparação.</p>
  }
  return (
    <ul className="space-y-1.5">
      {highlights.map((highlight) => (
        <li key={`${highlight.kind}-${highlight.label}`} className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground truncate">{highlight.label}</span>
          <span className={`tabular-nums font-bold ${deltaClass(highlight.delta)}`}>{formatPercentDelta(highlight.delta)}</span>
        </li>
      ))}
    </ul>
  )
}

function TopicTable({ topics }: { topics: ClimateSurveyTopicComparison[] }): React.ReactElement {
  if (topics.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Sem tópicos comparáveis.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tópico</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Base</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Comparada</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Variação</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32">Leitura</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((topic) => (
            <tr key={topic.dimension} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-xs font-medium text-foreground">
                <span className="flex items-center gap-2">
                  {topic.label}
                  {topic.crossedGoal && (
                    <span className={`${BADGE_BASE} ${BADGE_BLUE}`}>Cruzou a meta</span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatPercentValue(topic.baseValue)}</td>
              <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatPercentValue(topic.compareValue)}</td>
              <td className={`px-4 py-3 text-xs tabular-nums font-bold ${deltaClass(topic.delta)}`}>
                {formatPercentDelta(topic.delta)}
              </td>
              <td className="px-4 py-3">
                <ReadingPill reading={topic.reading} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DepartmentTable({ departments }: { departments: ClimateSurveyDepartmentComparison[] }): React.ReactElement {
  if (departments.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Sem departamentos comparáveis.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Departamento</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Base</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Comparada</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Variação</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32">Leitura</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.departmentId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-xs font-medium text-foreground">{department.label}</td>
              {department.excluded ? (
                <td className="px-4 py-3 text-xs text-muted-foreground" colSpan={4}>
                  Amostra insuficiente em uma das ondas
                </td>
              ) : (
                <>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatPercentValue(department.baseValue)}</td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatPercentValue(department.compareValue)}</td>
                  <td className={`px-4 py-3 text-xs tabular-nums font-bold ${deltaClass(department.delta)}`}>
                    {formatPercentDelta(department.delta)}
                  </td>
                  <td className="px-4 py-3">
                    <ReadingPill reading={department.reading} />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function ClimateSurveyComparePage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard")

  const params = await searchParams
  const [data, org] = await Promise.all([
    getClimateSurveyWaveComparison(session.tenantId, params["base"], params["compare"]),
    getOrganization(session.tenantId),
  ])
  const timezone = org?.timezone ?? "America/Sao_Paulo"

  const options = data.options.map((option) => ({
    id: option.id,
    label: formatWaveLabel(option.configName, option.scheduledAt, timezone),
  }))
  const baseId = data.baseId ?? ""
  const compareId = data.compareId ?? ""
  const comparison = data.comparison
  const baseLabel = comparison !== null ? formatWaveLabel(comparison.base.configName, comparison.base.scheduledAt, timezone) : "Onda base"
  const compareLabel =
    comparison !== null ? formatWaveLabel(comparison.compare.configName, comparison.compare.scheduledAt, timezone) : "Onda comparada"

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/climate-surveys" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Pesquisa de Clima
        </Link>
        <div className="mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">Comparativo entre ondas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare duas ondas lado a lado e a evolução por tópico e departamento
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {options.length < 2 ? (
          <div className="border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">São necessárias ao menos duas ondas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Dispare uma nova pesquisa de clima para comparar os resultados entre ondas.
            </p>
          </div>
        ) : (
          <>
            <ClimateSurveyWaveComparisonFilters options={options} baseId={baseId} compareId={compareId} />

            {comparison === null ? (
              <div className="border border-dashed border-border bg-card px-5 py-10 text-center">
                <p className="text-sm font-bold text-muted-foreground">Selecione duas ondas diferentes</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {comparison.metrics.map((metric) => (
                    <div key={metric.key} className="border border-border bg-card px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {metric.label}
                      </p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-3xl font-bold tabular-nums text-foreground">
                          {formatMetricValue(metric.compareValue, metric.unit)}
                        </p>
                        <p className={`text-xs font-bold tabular-nums ${metricDeltaClass(metric.delta, metric.higherIsBetter)}`}>
                          {formatMetricDelta(metric.delta, metric.unit)}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Base: {formatMetricValue(metric.baseValue, metric.unit)}
                      </p>
                    </div>
                  ))}
                </div>

                <ChartCard
                  title="Favorabilidade por tópico"
                  subtitle={`${baseLabel} × ${compareLabel} — linha tracejada = meta`}
                >
                  <ClimateSurveyWaveComparisonChart
                    topics={comparison.topics}
                    baseLabel={baseLabel}
                    compareLabel={compareLabel}
                    goalPercent={CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT}
                  />
                </ChartCard>

                <ChartCard title="Comparação por tópico" subtitle="Base × comparada, variação e leitura (RN-05)">
                  <TopicTable topics={comparison.topics} />
                </ChartCard>

                <ChartCard title="Comparação por departamento" subtitle="Base × comparada, variação e leitura (RN-05)">
                  <DepartmentTable departments={comparison.departments} />
                </ChartCard>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title="Maiores altas" subtitle="Três maiores ganhos em p.p.">
                    <HighlightList highlights={comparison.topIncreases} />
                  </ChartCard>
                  <ChartCard title="Maiores quedas" subtitle="Três maiores perdas em p.p.">
                    <HighlightList highlights={comparison.topDrops} />
                  </ChartCard>
                </div>

                <div className="border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Planos de ação da onda base
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold tabular-nums text-foreground mt-1">{comparison.actionPlans.total}</p>
                    </div>
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Concluídos</p>
                      <p className="text-2xl font-bold tabular-nums text-status-success mt-1">{comparison.actionPlans.completed}</p>
                    </div>
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Em andamento</p>
                      <p className="text-2xl font-bold tabular-nums text-status-warning mt-1">{comparison.actionPlans.inProgress}</p>
                    </div>
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Planejados</p>
                      <p className="text-2xl font-bold tabular-nums text-muted-foreground mt-1">{comparison.actionPlans.open}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
