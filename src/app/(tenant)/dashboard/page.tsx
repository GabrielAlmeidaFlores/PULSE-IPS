import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getSession } from "@/modules/auth/session"
import { getAlerts } from "@/modules/alerts/alert.service"
import { getDashboardData, getAvailableQuestions } from "@/modules/dashboard/dashboard.service"
import { PageHelp } from "@/components/page-help"
import { ScoreTrendChart } from "@/app/(tenant)/dashboard/components/score-trend-chart"
import { DeptComparisonChart, AdherenceChart, DeptMultiLineChart } from "@/app/(tenant)/dashboard/components/dept-charts"
import { DeptScoreCards } from "@/app/(tenant)/dashboard/components/dept-score-cards"
import { QuestionFilter } from "@/app/(tenant)/dashboard/components/question-filter"
import { Activity, Users, AlertTriangle, BarChart2 } from "lucide-react"

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
  const unreadAlerts = recentAlerts.filter((a) => !a.isRead).length
  const criticalAlerts = recentAlerts.filter((a) => a.severity === "critical" && !a.resolvedAt)

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

        {hasEnoughData && (
          <div className="border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest">Evolução do score geral</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Média de todas as pesquisas por mês</p>
            </div>
            <div className="px-4 py-4">
              <ScoreTrendChart data={overallTrend} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {deptComparison.length > 0 && (
            <div className="border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest">Score por setor</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Comparação do período mais recente</p>
              </div>
              <div className="px-2 py-4">
                <DeptComparisonChart data={deptComparison} />
              </div>
            </div>
          )}
          {adherenceChart.length > 0 && (
            <div className="border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest">Taxa de adesão</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">% de colaboradores que responderam</p>
              </div>
              <div className="px-2 py-4">
                <AdherenceChart data={adherenceChart} />
              </div>
            </div>
          )}
        </div>

        {deptMonthlyChart.length > 0 && deptNames.length > 0 && (
          <div className="border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest">Evolução por setor</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Score médio de cada setor ao longo dos meses</p>
            </div>
            <div className="px-4 py-4">
              <DeptMultiLineChart data={deptMonthlyChart} deptNames={deptNames} />
            </div>
          </div>
        )}

        {recentAlerts.length > 0 && (
          <div className="border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest">Alertas recentes</span>
              <span className="text-[10px] text-muted-foreground">{criticalAlerts.length} crítico{criticalAlerts.length !== 1 ? "s" : ""}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {recentAlerts.slice(0, 6).map((alert) => (
                  <tr key={alert.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${alert.severity === "critical" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                        {alert.severity === "critical" ? "Crítico" : "Atenção"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">{alert.message}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${alert.isRead ? "bg-muted text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/20"}`}>
                        {alert.isRead ? "lido" : "novo"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-[10px] text-muted-foreground ${unreadAlerts > 0 ? "" : ""}`}>
                        {alert.resolvedAt ? "Resolvido" : "Aberto"}
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
  )
}
