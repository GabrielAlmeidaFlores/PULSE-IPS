import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import {
  getClimateSurveyWaveComparison,
  type ClimateSurveyMetricComparison,
} from "@/modules/climate-surveys/climate-survey-comparison.service"
import { ClimateSurveyWaveComparisonFilters } from "@/app/(tenant)/climate-surveys/compare/climate-survey-wave-comparison-filters"

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

function formatValue(value: number | null, unit: ClimateSurveyMetricComparison["unit"]): string {
  if (value === null) return "—"
  return `${value.toFixed(1)}${unit === "percent" ? "%" : ""}`
}

function formatDelta(delta: number | null, unit: ClimateSurveyMetricComparison["unit"]): string {
  if (delta === null) return "—"
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta.toFixed(1)}${unit === "percent" ? " p.p." : " pts"}`
}

function deltaClass(delta: number | null): string {
  if (delta === null || delta === 0) return "text-muted-foreground"
  return delta > 0 ? "text-status-success" : "text-status-danger"
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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/climate-surveys" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Pesquisa de Clima
        </Link>
        <div className="mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">Comparativo entre ondas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare os resultados de duas ondas e o impacto dos planos de ação (ROI)
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
                          {formatValue(metric.compareValue, metric.unit)}
                        </p>
                        <p className={`text-xs font-bold tabular-nums ${deltaClass(metric.delta)}`}>
                          {formatDelta(metric.delta, metric.unit)}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Base: {formatValue(metric.baseValue, metric.unit)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Por tópico
                    </p>
                  </div>
                  {comparison.topics.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-sm font-bold text-muted-foreground">Sem tópicos comparáveis</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tópico</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Base</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Comparada</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Variação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparison.topics.map((topic, index) => (
                            <tr
                              key={topic.dimension}
                              className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${index % 2 !== 0 ? "bg-muted/10" : ""}`}
                            >
                              <td className="px-4 py-3 text-xs font-medium text-foreground">{topic.label}</td>
                              <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatValue(topic.baseScorePercent, "percent")}</td>
                              <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatValue(topic.compareScorePercent, "percent")}</td>
                              <td className={`px-4 py-3 text-xs tabular-nums font-bold ${deltaClass(topic.delta)}`}>
                                {formatDelta(topic.delta, "percent")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
