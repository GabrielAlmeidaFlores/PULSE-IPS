import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getSession } from "@/modules/auth/session"
import { getAlerts } from "@/modules/alerts/alert.service"
import { getDashboardData, getAvailableQuestions } from "@/modules/dashboard/dashboard.service"
import { PageHelp } from "@/components/page-help"
import { ChartCard } from "@/components/chart-card"
import { ScoreTrendChart } from "@/app/(tenant)/dashboard/components/score-trend-chart"
import { DeptComparisonChart, AdherenceChart, DeptMultiLineChart } from "@/app/(tenant)/dashboard/components/dept-charts"
import { DeptScoreCards } from "@/app/(tenant)/dashboard/components/dept-score-cards"
import { QuestionFilter } from "@/app/(tenant)/dashboard/components/question-filter"
import { Activity, Users, AlertTriangle, BarChart2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { AlertTypeInfo } from "@/components/alert-type-info"
import { format } from "date-fns"
import Link from "next/link"
import {
  BADGE_DEFAULT,
  BADGE_BASE,
  SEVERITY_LABELS,
  SEVERITY_STYLE,
  SEVERITY_DOT,
  TYPE_LABELS,
  TYPE_STYLE,
} from "@/libs/design-system/alert-labels"

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardPage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const rawQ = params["q"]
  const qArray = Array.isArray(rawQ) ? rawQ : [rawQ].filter(Boolean) as string[]
  const selectedOrders = qArray.map(Number).filter((n) => Number.isFinite(n) && n > 0)

  const [dashboard, recentAlerts, availableQuestions] = await Promise.all([
    getDashboardData(session.tenantId, selectedOrders),
    getAlerts(session.tenantId),
    getAvailableQuestions(session.tenantId),
  ])

  const { kpis, overallTrend, deptMonthlyChart, deptNames, deptComparison, adherenceChart, deptCards } = dashboard
  const criticalAlerts = recentAlerts.filter((a) => a.severity === "critical" && !a.resolvedAt)

  const healthyDeptCount = deptCards.filter((c) => c.avg >= 3.5).length
  const warningDeptCount = deptCards.filter((c) => c.avg >= 2.5 && c.avg < 3.5).length
  const criticalDeptCount = deptCards.filter((c) => c.avg > 0 && c.avg < 2.5).length
  const topDept = [...deptCards].filter((c) => c.avg > 0).sort((a, b) => b.avg - a.avg)[0] ?? null
  const bottomDept = [...deptCards].filter((c) => c.avg > 0).sort((a, b) => a.avg - b.avg)[0] ?? null

  function resolveSubtitle(): string {
    if (selectedOrders.length === 0) return "Insights sobre saúde ocupacional"
    const label = selectedOrders.length === 1 ? "pergunta" : "perguntas"
    return `Filtrado por ${label}: ${selectedOrders.map((o) => `P${o}`).join(", ")}`
  }

  function resolveScoreLabel(avg: number | null): string {
    if (avg === null) return "—"
    if (avg >= 3.5) return "Saudável"
    if (avg >= 2.5) return "Atenção"
    return "Crítico"
  }

  function resolveScoreAccent(avg: number | null): string {
    if (avg === null) return "text-muted-foreground"
    if (avg >= 3.5) return "text-green-600"
    if (avg >= 2.5) return "text-yellow-600"
    return "text-red-600"
  }

  const scoreLabel = resolveScoreLabel(kpis.avgScore)
  const scoreAccent = resolveScoreAccent(kpis.avgScore)
  const hasEnoughData = overallTrend.length > 0

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Dashboard</h1>
            <PageHelp text="Painel de insights sobre saúde ocupacional. Mostra a evolução do score geral, comparação entre setores, taxa de adesão às pesquisas e performance individual de cada setor ao longo do tempo." />
          </div>
          {availableQuestions.length > 0 && (
            <Suspense>
              <QuestionFilter questions={availableQuestions} />
            </Suspense>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{resolveSubtitle()}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="grid grid-cols-4 gap-0 border border-border bg-card">
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Colaboradores</p>
            </div>
            <p className="text-3xl font-black text-primary">{kpis.totalEmployees}</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score médio (30d)</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black ${scoreAccent}`}>{kpis.avgScore?.toFixed(2) ?? "—"}</p>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${scoreAccent}`}>{scoreLabel}</span>
            </div>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total de respostas</p>
            </div>
            <p className="text-3xl font-black text-foreground">{kpis.totalResponses}</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Alertas ativos</p>
            </div>
            <p className={`text-3xl font-black ${kpis.activeAlerts > 0 ? "text-destructive" : "text-foreground"}`}>{kpis.activeAlerts}</p>
          </div>
        </div>

        {deptCards.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Performance por setor — período atual</p>
            <DeptScoreCards cards={deptCards} />
          </div>
        )}

        {deptCards.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 dark:text-green-500">Saudáveis</p>
                <p className="text-2xl font-black font-mono text-green-700 dark:text-green-500">{healthyDeptCount}</p>
                <p className="text-[10px] text-green-600/70 dark:text-green-500/70">setores</p>
              </div>
            </div>
            <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Minus className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-500">Atenção</p>
                <p className="text-2xl font-black font-mono text-amber-700 dark:text-amber-500">{warningDeptCount}</p>
                <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70">setores</p>
              </div>
            </div>
            <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-500">Críticos</p>
                <p className="text-2xl font-black font-mono text-red-700 dark:text-red-500">{criticalDeptCount}</p>
                <p className="text-[10px] text-red-600/70 dark:text-red-500/70">setores</p>
              </div>
            </div>
          </div>
        )}

        {(topDept ?? bottomDept) && topDept?.deptId !== bottomDept?.deptId && (
          <div className="grid grid-cols-2 gap-3">
            {topDept && (
              <div className="border border-border bg-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Setor em destaque</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-foreground truncate">{topDept.dept}</p>
                  <div className="shrink-0 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                    <p className="text-xl font-black font-mono text-green-600">{topDept.avg.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
            {bottomDept && (
              <div className="border border-border bg-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  {bottomDept.avg < 2.5 ? "Setor crítico" : "Setor com menor score"}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-foreground truncate">{bottomDept.dept}</p>
                  <div className="shrink-0 flex items-center gap-2">
                    {bottomDept.avg < 2.5 ? (
                      <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <p className={`text-xl font-black font-mono ${bottomDept.avg < 2.5 ? "text-red-600" : "text-amber-600"}`}>{bottomDept.avg.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {hasEnoughData && (
          <ChartCard title="Evolução do score geral" subtitle="Média de todas as pesquisas por mês (últimos 6 meses)">
            <ScoreTrendChart data={overallTrend} />
          </ChartCard>
        )}

        <div className="grid grid-cols-2 gap-6">
          {deptComparison.length > 0 && (
            <ChartCard title="Score por setor" subtitle="Comparação do período mais recente">
              <div className="px-0">
                <DeptComparisonChart data={deptComparison} />
              </div>
            </ChartCard>
          )}
          {adherenceChart.length > 0 && (
            <ChartCard title="Taxa de adesão" subtitle="% de colaboradores que responderam por setor">
              <div className="px-0">
                <AdherenceChart data={adherenceChart} />
              </div>
            </ChartCard>
          )}
        </div>

        {deptMonthlyChart.length > 0 && deptNames.length > 0 && (
          <ChartCard title="Evolução por setor" subtitle="Score médio de cada setor ao longo dos últimos 6 meses">
            <DeptMultiLineChart data={deptMonthlyChart} deptNames={deptNames} />
          </ChartCard>
        )}

        {recentAlerts.length > 0 && (
          <div className="border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between bg-muted/40">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Alertas recentes</span>
              <div className="flex items-center gap-3">
                {criticalAlerts.length > 0 && (
                  <span className="text-[10px] font-bold text-destructive">{criticalAlerts.length} crítico{criticalAlerts.length !== 1 ? "s" : ""}</span>
                )}
                <Link href="/alerts" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">Ver todos</Link>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Severidade</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mensagem</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.slice(0, 6).map((alert, i) => {
                  let statusCls: string
                  let statusLabel: string
                  if (alert.resolvedAt) {
                    statusCls = "bg-green-100 text-green-800 border-green-300"
                    statusLabel = "resolvido"
                  } else if (alert.isRead) {
                    statusCls = BADGE_DEFAULT
                    statusLabel = "lido"
                  } else {
                    statusCls = "bg-amber-100 text-amber-800 border-amber-300"
                    statusLabel = "novo"
                  }
                  return (
                    <tr key={alert.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-0.5">
                          <span className={`${BADGE_BASE} ${TYPE_STYLE[alert.type] ?? BADGE_DEFAULT}`}>
                            {TYPE_LABELS[alert.type] ?? alert.type}
                          </span>
                          <AlertTypeInfo type={alert.type} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${SEVERITY_STYLE[alert.severity] ?? BADGE_DEFAULT}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[alert.severity] ?? "bg-muted-foreground"}`} />
                          {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{alert.message}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{format(new Date(alert.createdAt), "dd/MM HH:mm")}</td>
                      <td className="px-4 py-3">
                        <span className={`${BADGE_BASE} ${statusCls}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
