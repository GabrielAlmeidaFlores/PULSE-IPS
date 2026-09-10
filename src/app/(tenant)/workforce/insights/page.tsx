import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getWorkforceInsights } from "@/modules/workforce/workforce-insights.service"
import { FilterBar } from "@/libs/design-system"
import { BADGE_AMBER, BADGE_BASE, BADGE_BLUE, BADGE_GREEN, BADGE_RED } from "@/libs/design-system/alert-labels"
import type { WorkforceInsight, WorkforceInsightKind, WorkforceRiskLevel } from "@/modules/workforce/workforce.types"
import { GenerateWorkforceInsightsButton } from "@/app/(tenant)/workforce/insights/generate-workforce-insights-button"
import { CreateActionPlanFromInsightButton } from "@/app/(tenant)/workforce/insights/create-action-plan-from-insight-button"

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

const RISK_LABELS: Record<WorkforceRiskLevel, string> = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
}

const RISK_STYLES: Record<WorkforceRiskLevel, string> = {
  high: BADGE_RED,
  medium: BADGE_AMBER,
  low: BADGE_GREEN,
}

const INSIGHT_KIND_ORDER: WorkforceInsightKind[] = ["burnout_risk", "root_cause", "action_suggestion"]

const INSIGHT_KIND_LABELS: Record<WorkforceInsightKind, string> = {
  burnout_risk: "Risco de burnout",
  root_cause: "Causa raiz",
  action_suggestion: "Sugestões de ação",
}

const SEVERITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
}

const SEVERITY_STYLES: Record<string, string> = {
  high: BADGE_RED,
  medium: BADGE_AMBER,
  low: BADGE_BLUE,
}

function formatCompetenciaLabel(competencia: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(competencia)
  if (match === null) return competencia
  const year = match[1]
  const month = match[2]
  if (year === undefined || month === undefined) return competencia
  return `${month}/${year}`
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : value.toFixed(0)
}

export default async function WorkforceInsightsPage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const competencia = params["competencia"]
  const { analysis, insights } = await getWorkforceInsights(session.tenantId, competencia)

  const insightsByKind = new Map<WorkforceInsightKind, WorkforceInsight[]>()
  for (const insight of insights) {
    const group = insightsByKind.get(insight.kind) ?? []
    group.push(insight)
    insightsByKind.set(insight.kind, group)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/workforce" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Métricas de Equipe
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest">Análise de Equipe com IA</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cruzamento de absenteísmo e turnover com o clima organizacional
            </p>
          </div>
          {analysis.competencia !== null && analysis.rows.length > 0 ? (
            <GenerateWorkforceInsightsButton competencia={analysis.competencia} />
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {analysis.competencia === null ? (
          <div className="border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhum dado importado ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Importe um arquivo de ponto/planilha para cruzar indicadores com o clima.
            </p>
            <Link
              href="/workforce/import"
              className="inline-block mt-4 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              style={{ borderRadius: 0 }}
            >
              Importar dados
            </Link>
          </div>
        ) : (
          <>
            <FilterBar
              fields={[
                {
                  type: "select",
                  key: "competencia",
                  label: "Competência",
                  width: "w-[180px]",
                  options: analysis.competencias.map((value) => ({
                    value,
                    label: formatCompetenciaLabel(value),
                  })),
                },
              ]}
              values={{
                ...(params["competencia"] !== undefined ? { competencia: params["competencia"] } : {}),
              }}
            />

            <div className="border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Matriz de risco · {formatCompetenciaLabel(analysis.competencia)}
                </p>
              </div>
              {analysis.rows.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-bold text-muted-foreground">Sem dados por setor</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Setor</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24">Headcount</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Absenteísmo</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24">Turnover</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24">Clima</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24">eNPS</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24">Risco</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.rows.map((row, index) => (
                        <tr
                          key={row.departmentName}
                          className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${index % 2 !== 0 ? "bg-muted/10" : ""}`}
                        >
                          <td className="px-4 py-3 text-xs font-medium text-foreground">{row.departmentName}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-foreground">{row.headcount}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatPercent(row.absenteeismPercent)}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatPercent(row.turnoverPercent)}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatPercent(row.climateScorePercent)}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatNumber(row.climateEnps)}</td>
                          <td className="px-4 py-3">
                            <span className={`${BADGE_BASE} ${RISK_STYLES[row.riskLevel]}`}>{RISK_LABELS[row.riskLevel]}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {insights.length === 0 ? (
              <div className="border border-dashed border-border bg-card px-5 py-10 text-center">
                <p className="text-sm font-bold text-muted-foreground">Nenhuma análise gerada ainda</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em “Gerar análise com IA” para identificar causas raiz, risco de burnout e sugestões de ação.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {INSIGHT_KIND_ORDER.map((kind) => {
                  const group = insightsByKind.get(kind) ?? []
                  if (group.length === 0) return null
                  return (
                    <div key={kind} className="border border-border bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {INSIGHT_KIND_LABELS[kind]}
                        </p>
                      </div>
                      <div className="divide-y divide-border">
                        {group.map((insight) => (
                          <div key={insight.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-bold text-foreground">{insight.title}</p>
                              <span className={`${BADGE_BASE} ${SEVERITY_STYLES[insight.severity] ?? BADGE_BLUE}`}>
                                {SEVERITY_LABELS[insight.severity] ?? insight.severity}
                              </span>
                            </div>
                            {insight.departmentName !== null ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{insight.departmentName}</p>
                            ) : null}
                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{insight.description}</p>
                            {kind === "action_suggestion" && (
                              <CreateActionPlanFromInsightButton insightId={insight.id} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
