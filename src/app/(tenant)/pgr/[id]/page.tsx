import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getPgrReviewById } from "@/modules/pgr/pgr.service"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Activity,
  BarChart2,
  Building2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import {
  PgrScoreComparisonChart,
  PgrAdherenceComparisonChart,
  PgrDeptQuestionsChart,
  type DeptOverviewData,
  type QuestionChartData,
} from "@/app/(tenant)/pgr/[id]/pgr-charts"
import { PgrTabsLayout } from "@/app/(tenant)/pgr/[id]/pgr-tabs"
import { ChartCard } from "@/components/chart-card"
import type { ScoreDirection } from "@/modules/surveys/survey.types"

interface PageProps {
  params: Promise<{ id: string }>
}

function scoreLabel(avg: number): string {
  if (avg >= 3.5) return "Saudável"
  if (avg >= 2.5) return "Atenção"
  if (avg > 0) return "Crítico"
  return "Sem dados"
}

function rawDisplayScore(normalizedAvg: number, direction: ScoreDirection): number {
  return direction === "lower_is_better" ? 6 - normalizedAvg : normalizedAvg
}

function scoreColor(avg: number): string {
  if (avg >= 3.5) return "text-green-600 dark:text-green-500"
  if (avg >= 2.5) return "text-amber-600 dark:text-amber-500"
  if (avg > 0) return "text-red-600 dark:text-red-500"
  return "text-muted-foreground"
}

function scoreBg(avg: number): string {
  if (avg >= 3.5) return "bg-green-500"
  if (avg >= 2.5) return "bg-amber-500"
  if (avg > 0) return "bg-red-500"
  return "bg-muted-foreground"
}

function scoreBadge(avg: number): string {
  if (avg >= 3.5) return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"
  if (avg >= 2.5) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
  if (avg > 0) return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700"
  return "bg-muted text-muted-foreground border-border"
}

function adherenceBg(pct: number): string {
  if (pct >= 80) return "bg-green-500"
  if (pct >= 50) return "bg-amber-500"
  return "bg-red-500"
}

function adherenceColor(pct: number): string {
  if (pct >= 80) return "text-green-600 dark:text-green-500"
  if (pct >= 50) return "text-amber-600 dark:text-amber-500"
  return "text-red-600 dark:text-red-500"
}

interface ScoreTrendIconProps { avg: number }
interface ScoreGaugeProps { score: number }
interface QuestionAggEntry { text: string; order: number; scoreDirection: ScoreDirection; totalWeighted: number; totalCount: number }

function ScoreTrendIcon({ avg }: ScoreTrendIconProps): React.ReactElement {
  if (avg >= 3.5) return <TrendingUp className="w-4 h-4 text-green-500" />
  if (avg >= 2.5) return <Minus className="w-4 h-4 text-amber-500" />
  return <TrendingDown className="w-4 h-4 text-red-500" />
}

function ScoreGauge({ score }: ScoreGaugeProps): React.ReactElement {
  const pct = Math.min((score / 5) * 100, 100)
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (pct / 100) * circumference
  const colorClass = (() => {
    if (score >= 3.5) return "#16a34a"
    if (score >= 2.5) return "#d97706"
    if (score > 0) return "#dc2626"
    return "#94a3b8"
  })()

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={colorClass}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-black font-mono" style={{ color: colorClass }}>{score.toFixed(1)}</span>
      </div>
    </div>
  )
}

export default async function PgrDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const { id } = await params
  const review = await getPgrReviewById(id, session.tenantId)
  if (!review) notFound()

  const periodLabel = (() => {
    const [year, month] = review.period.split("-")
    return format(new Date(Number(year), Number(month) - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
  })()

  const depts = review.deptResults
  const allQuestions = [...review.questionResults].sort((a, b) => a.questionOrder - b.questionOrder)

  const totalEmployees = depts.reduce((s, d) => s + d.employeeCount, 0)
  const totalResponses = depts.reduce((s, d) => s + d.responseCount, 0)
  const totalRecipients = depts.reduce((s, d) => s + d.totalRecipients, 0)
  const adherencePct = totalRecipients > 0 ? Math.round((totalResponses / totalRecipients) * 100) : 0

  const scoredDepts = depts.filter((d) => d.avgScore > 0)
  const globalAvg =
    scoredDepts.length > 0
      ? scoredDepts.reduce((s, d) => s + d.avgScore, 0) / scoredDepts.length
      : 0

  const healthyDepts = scoredDepts.filter((d) => d.avgScore >= 3.5).length
  const warningDepts = scoredDepts.filter((d) => d.avgScore >= 2.5 && d.avgScore < 3.5).length
  const criticalDepts = scoredDepts.filter((d) => d.avgScore > 0 && d.avgScore < 2.5).length

  const questionAggMap = new Map<string, QuestionAggEntry>()
  for (const q of allQuestions) {
    if (!questionAggMap.has(q.questionId)) {
      questionAggMap.set(q.questionId, { text: q.questionText, order: q.questionOrder, scoreDirection: q.scoreDirection as ScoreDirection, totalWeighted: 0, totalCount: 0 })
    }
    const entry = questionAggMap.get(q.questionId)
    if (entry) {
      entry.totalWeighted += q.avgScore * q.responseCount
      entry.totalCount += q.responseCount
    }
  }
  const aggregatedQuestions = [...questionAggMap.entries()]
    .map(([qId, v]) => ({
      id: qId,
      text: v.text,
      order: v.order,
      scoreDirection: v.scoreDirection,
      avgScore: v.totalCount > 0 ? v.totalWeighted / v.totalCount : 0,
      responseCount: v.totalCount,
    }))
    .sort((a, b) => a.avgScore - b.avgScore)

  const worstQuestion = aggregatedQuestions[0] ?? null
  const bestQuestion = aggregatedQuestions[aggregatedQuestions.length - 1] ?? null

  const deptOverviewData: DeptOverviewData[] = depts.map((d) => ({
    id: d.id,
    name: d.departmentName,
    avgScore: d.avgScore,
    adherencePct: d.totalRecipients > 0 ? Math.round((d.responseCount / d.totalRecipients) * 100) : 0,
    responseCount: d.responseCount,
    totalRecipients: d.totalRecipients,
    employeeCount: d.employeeCount,
  }))

  const deptsSortedByScore = [...depts].sort((a, b) => a.avgScore - b.avgScore)

  const hasData = depts.length > 0 && totalResponses > 0

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Link href="/pgr" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" />
            PGR
          </Link>
          <span>/</span>
          <span className="capitalize">{periodLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest capitalize">{periodLabel}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gerado em {format(new Date(review.reviewedAt ?? review.createdAt), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          </div>
          {hasData && (
            <div className="flex items-center gap-2">
              <ScoreTrendIcon avg={globalAvg} />
              <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${scoreBadge(globalAvg)}`}>
                {scoreLabel(globalAvg)}
              </span>
            </div>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma resposta encontrada para este período.</p>
            <p className="text-xs text-muted-foreground mt-1">Verifique se há pesquisas concluídas no período selecionado.</p>
          </div>
        </div>
      ) : (
        <PgrTabsLayout
          tabs={[
            { id: "overview", label: "Visão Geral" },
            { id: "byDept", label: "Por Setor", badge: depts.length },
            { id: "consolidated", label: "Consolidado" },
          ]}
          overview={
            <>
              <div className="grid grid-cols-5 gap-3">
                <div className="border border-border bg-card p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded border border-border bg-muted/40 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score Global</p>
                    <p className={`text-2xl font-black font-mono mt-0.5 ${scoreColor(globalAvg)}`}>{globalAvg.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">escala 1–5</p>
                  </div>
                </div>

                <div className="border border-border bg-card p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded border border-border bg-muted/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão Global</p>
                    <p className={`text-2xl font-black font-mono mt-0.5 ${adherenceColor(adherencePct)}`}>{adherencePct}%</p>
                    <p className="text-[10px] text-muted-foreground">{totalResponses}/{totalRecipients} resp.</p>
                  </div>
                </div>

                <div className="border border-border bg-card p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded border border-border bg-muted/40 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funcionários</p>
                    <p className="text-2xl font-black font-mono mt-0.5">{totalEmployees}</p>
                    <p className="text-[10px] text-muted-foreground">monitorados</p>
                  </div>
                </div>

                <div className="border border-border bg-card p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded border border-border bg-muted/40 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Departamentos</p>
                    <p className="text-2xl font-black font-mono mt-0.5">{depts.length}</p>
                    <p className="text-[10px] text-muted-foreground">avaliados</p>
                  </div>
                </div>

                <div className="border border-border bg-card p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded border border-border bg-muted/40 flex items-center justify-center shrink-0">
                    <BarChart2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Perguntas</p>
                    <p className="text-2xl font-black font-mono mt-0.5">{aggregatedQuestions.length}</p>
                    <p className="text-[10px] text-muted-foreground">avaliadas</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 dark:text-green-500">Saudáveis</p>
                    <p className="text-3xl font-black font-mono text-green-700 dark:text-green-500">{healthyDepts}</p>
                    <p className="text-[10px] text-green-600/70 dark:text-green-500/70">departamentos</p>
                  </div>
                </div>
                <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Minus className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-500">Atenção</p>
                    <p className="text-3xl font-black font-mono text-amber-700 dark:text-amber-500">{warningDepts}</p>
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70">departamentos</p>
                  </div>
                </div>
                <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-500">Críticos</p>
                    <p className="text-3xl font-black font-mono text-red-700 dark:text-red-500">{criticalDepts}</p>
                    <p className="text-[10px] text-red-600/70 dark:text-red-500/70">departamentos</p>
                  </div>
                </div>
              </div>

              {(bestQuestion ?? worstQuestion) && (
                <div className="grid grid-cols-2 gap-3">
                  {bestQuestion && (
                    <div className="border border-border bg-card p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Melhor Indicador</p>
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          <span className="text-[10px] font-black text-muted-foreground border border-border px-1.5 py-0.5">P{bestQuestion.order}</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed flex-1">{bestQuestion.text}</p>
                        <div className="shrink-0 text-right">
                          <p className={`text-xl font-black font-mono ${scoreColor(bestQuestion.avgScore)}`}>{bestQuestion.avgScore.toFixed(2)}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${scoreColor(bestQuestion.avgScore)}`}>{scoreLabel(bestQuestion.avgScore)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {worstQuestion && (
                    <div className="border border-border bg-card p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Indicador com Maior Risco</p>
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          <span className="text-[10px] font-black text-muted-foreground border border-border px-1.5 py-0.5">P{worstQuestion.order}</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed flex-1">{worstQuestion.text}</p>
                        <div className="shrink-0 text-right">
                          <p className={`text-xl font-black font-mono ${scoreColor(worstQuestion.avgScore)}`}>{worstQuestion.avgScore.toFixed(2)}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${scoreColor(worstQuestion.avgScore)}`}>{scoreLabel(worstQuestion.avgScore)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <ChartCard title="Score por Departamento" subtitle="Linhas de referência: saudável (3.5) e crítico (2.5)">
                  <PgrScoreComparisonChart depts={deptOverviewData} />
                </ChartCard>
                <ChartCard title="Adesão por Departamento" subtitle="Linha de referência: meta mínima (80%)">
                  <PgrAdherenceComparisonChart depts={deptOverviewData} />
                </ChartCard>
              </div>
            </>
          }
          byDept={
            <div className="space-y-4">
              {deptsSortedByScore.map((dept) => {
                const deptQuestions: QuestionChartData[] = allQuestions
                  .filter((q) => q.departmentId === dept.departmentId)
                  .map((q) => ({
                    id: q.id,
                    text: q.questionText,
                    avgScore: q.avgScore,
                    scoreDirection: q.scoreDirection as ScoreDirection,
                    order: q.questionOrder,
                    responseCount: q.responseCount,
                  }))

                const deptAdherencePct =
                  dept.totalRecipients > 0 ? Math.round((dept.responseCount / dept.totalRecipients) * 100) : 0

                const healthyQs = deptQuestions.filter((q) => q.avgScore >= 3.5).length
                const warningQs = deptQuestions.filter((q) => q.avgScore >= 2.5 && q.avgScore < 3.5).length
                const criticalQs = deptQuestions.filter((q) => q.avgScore > 0 && q.avgScore < 2.5).length

                const bestDeptQuestion = deptQuestions.length > 0
                  ? [...deptQuestions].sort((a, b) => b.avgScore - a.avgScore)[0]
                  : null
                const worstDeptQuestion = deptQuestions.length > 0
                  ? [...deptQuestions].sort((a, b) => a.avgScore - b.avgScore)[0]
                  : null

                return (
                  <div key={dept.id} className="border border-border bg-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-4">
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <h2 className="text-sm font-bold truncate">{dept.departmentName}</h2>
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shrink-0 ${scoreBadge(dept.avgScore)}`}>
                          {scoreLabel(dept.avgScore)}
                        </span>
                      </div>
                      <ScoreGauge score={dept.avgScore} />
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                      <div className="px-5 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funcionários</p>
                        <p className="text-lg font-black font-mono mt-0.5">{dept.employeeCount}</p>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Respostas</p>
                        <p className="text-lg font-black font-mono mt-0.5">{dept.responseCount}<span className="text-xs font-normal text-muted-foreground">/{dept.totalRecipients}</span></p>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className={`text-lg font-black font-mono ${adherenceColor(deptAdherencePct)}`}>{deptAdherencePct}%</p>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${adherenceBg(deptAdherencePct)}`} style={{ width: `${Math.min(deptAdherencePct, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {deptQuestions.length > 0 && (
                      <div className="px-5 py-3 border-b border-border bg-muted/10 flex items-center gap-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Distribuição:</p>
                        <div className="flex items-center gap-4">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <span className="text-green-700 dark:text-green-400 font-bold">{healthyQs}</span>
                            <span className="text-muted-foreground">saudáveis</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-amber-700 dark:text-amber-400 font-bold">{warningQs}</span>
                            <span className="text-muted-foreground">atenção</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <span className="text-red-700 dark:text-red-400 font-bold">{criticalQs}</span>
                            <span className="text-muted-foreground">críticos</span>
                          </span>
                        </div>
                        {(bestDeptQuestion ?? worstDeptQuestion) && (
                          <div className="ml-auto flex items-center gap-4">
                            {bestDeptQuestion && (
                              <span className="text-[10px] text-muted-foreground">
                                Melhor: <span className="font-bold text-green-600 dark:text-green-500">P{bestDeptQuestion.order} ({rawDisplayScore(bestDeptQuestion.avgScore, bestDeptQuestion.scoreDirection).toFixed(1)})</span>
                              </span>
                            )}
                            {worstDeptQuestion && (
                              <span className="text-[10px] text-muted-foreground">
                                Pior: <span className={`font-bold ${scoreColor(worstDeptQuestion.avgScore)}`}>P{worstDeptQuestion.order} ({rawDisplayScore(worstDeptQuestion.avgScore, worstDeptQuestion.scoreDirection).toFixed(1)})</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {deptQuestions.length > 0 && (
                      <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="p-5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Score por Pergunta</p>
                          <PgrDeptQuestionsChart questions={deptQuestions} />
                        </div>
                        <div className="divide-y divide-border">
                          {[...deptQuestions].sort((a, b) => a.order - b.order).map((q, i) => (
                            <div key={q.id} className={`px-4 py-3 grid grid-cols-[24px_1fr_auto] gap-3 items-center ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                              <span className="text-[10px] font-black text-muted-foreground">P{q.order}</span>
                              <p className="text-xs text-foreground leading-snug">{q.text}</p>
                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <span className={`text-base font-black font-mono ${scoreColor(q.avgScore)}`}>{rawDisplayScore(q.avgScore, q.scoreDirection).toFixed(1)}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-wide ${scoreColor(q.avgScore)}`}>{scoreLabel(q.avgScore)}</span>
                                <span className="text-[9px] text-muted-foreground">{q.responseCount} resp.</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {deptQuestions.length === 0 && (
                      <div className="px-5 py-6 text-center">
                        <p className="text-xs text-muted-foreground">Nenhuma resposta para este departamento neste período.</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          }
          consolidated={
            <div className="border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Consolidado de Departamentos</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Todos os {depts.length} departamentos — ordenado por score (menor primeiro)</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Departamento</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funcionários</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Respostas</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Distribuição</th>
                  </tr>
                </thead>
                <tbody>
                  {[...depts].sort((a, b) => a.avgScore - b.avgScore).map((dept, i) => {
                    const rate = dept.totalRecipients > 0 ? Math.round((dept.responseCount / dept.totalRecipients) * 100) : 0
                    const dq = allQuestions.filter((q) => q.departmentId === dept.departmentId)
                    const hq = dq.filter((q) => q.avgScore >= 3.5).length
                    const wq = dq.filter((q) => q.avgScore >= 2.5 && q.avgScore < 3.5).length
                    const cq = dq.filter((q) => q.avgScore > 0 && q.avgScore < 2.5).length
                    return (
                      <tr key={dept.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                        <td className="px-4 py-3 font-medium text-xs">{dept.departmentName}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground text-center font-mono">{dept.employeeCount}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground text-center font-mono">{dept.responseCount}/{dept.totalRecipients}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${adherenceBg(rate)}`} style={{ width: `${Math.min(rate, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-mono font-bold ${adherenceColor(rate)}`}>{rate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${scoreBg(dept.avgScore)}`} style={{ width: `${Math.min((dept.avgScore / 5) * 100, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-mono font-bold ${scoreColor(dept.avgScore)}`}>{dept.avgScore.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${scoreBadge(dept.avgScore)}`}>
                            {scoreLabel(dept.avgScore)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-2 text-[10px]">
                            <span className="text-green-600 dark:text-green-500 font-bold">{hq}🟢</span>
                            <span className="text-amber-600 dark:text-amber-500 font-bold">{wq}🟡</span>
                            <span className="text-red-600 dark:text-red-500 font-bold">{cq}🔴</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          }
        />
      )}
    </div>
  )
}
