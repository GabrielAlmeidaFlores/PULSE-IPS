import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getPgrReviewById, getPgrScoreDistributions } from "@/modules/pgr/pgr.service"
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
import { PgrDeptAccordionItem } from "@/app/(tenant)/pgr/[id]/pgr-dept-accordion"
import { PgrScoreDistributionWidget, type QuestionDistDisplay } from "@/app/(tenant)/pgr/[id]/pgr-score-distribution"
import { PgrMarkReviewedButton } from "@/app/(tenant)/pgr/[id]/pgr-mark-reviewed-button"
import { ChartCard } from "@/components/chart-card"
import type { ScoreDirection } from "@/modules/surveys/survey.types"
import { toHealthIndex, healthIndexAccent, healthIndexBarColor, healthIndexChartColor } from "@/libs/utils/health-index"

interface PageProps {
  params: Promise<{ id: string }>
}

function scoreColor(hi: number): string {
  return healthIndexAccent(hi)
}

function scoreBg(hi: number): string {
  return healthIndexBarColor(hi)
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

interface ScoreTrendIconProps { hi: number }
interface ScoreGaugeProps { hi: number }
interface QuestionAggEntry { text: string; order: number; scoreDirection: ScoreDirection; totalWeighted: number; totalCount: number }

function ScoreTrendIcon({ hi }: ScoreTrendIconProps): React.ReactElement {
  if (hi >= 62) return <TrendingUp className="w-4 h-4 text-green-500" />
  if (hi >= 37) return <Minus className="w-4 h-4 text-amber-500" />
  return <TrendingDown className="w-4 h-4 text-red-500" />
}

function ScoreGauge({ hi }: ScoreGaugeProps): React.ReactElement {
  const pct = Math.min(hi, 100)
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (pct / 100) * circumference
  const color = healthIndexChartColor(hi)

  return (
    <div className="relative inline-flex flex-col items-center gap-0.5">
      <div className="relative inline-flex items-center justify-center">
        <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black font-mono" style={{ color }}>{hi}%</span>
        </div>
      </div>
      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Índice de Saúde</span>
    </div>
  )
}

export default async function PgrDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const { id } = await params
  const review = await getPgrReviewById(session.tenantId, id)
  if (!review) notFound()

  const distributions = await getPgrScoreDistributions(session.tenantId, review.period, review.questionResults)

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
  const globalAvgRaw =
    scoredDepts.length > 0
      ? scoredDepts.reduce((s, d) => s + d.avgScore, 0) / scoredDepts.length
      : 0
  const globalAvg = toHealthIndex(globalAvgRaw)

  const healthyDepts = scoredDepts.filter((d) => toHealthIndex(d.avgScore) >= 62).length
  const warningDepts = scoredDepts.filter((d) => { const hi = toHealthIndex(d.avgScore); return hi >= 37 && hi < 62 }).length
  const criticalDepts = scoredDepts.filter((d) => toHealthIndex(d.avgScore) < 37).length

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
      avgScore: v.totalCount > 0 ? toHealthIndex(v.totalWeighted / v.totalCount) : 0,
      responseCount: v.totalCount,
    }))
    .sort((a, b) => a.avgScore - b.avgScore)

  const worstQuestion = aggregatedQuestions[0] ?? null
  const bestQuestion = aggregatedQuestions[aggregatedQuestions.length - 1] ?? null

  const deptOverviewData: DeptOverviewData[] = depts.map((d) => ({
    id: d.id,
    name: d.departmentName,
    avgScore: toHealthIndex(d.avgScore),
    adherencePct: d.totalRecipients > 0 ? Math.round((d.responseCount / d.totalRecipients) * 100) : 0,
    responseCount: d.responseCount,
    totalRecipients: d.totalRecipients,
    employeeCount: d.employeeCount,
  }))

  const deptsSortedByScore = [...depts].sort((a, b) => a.avgScore - b.avgScore)

  const hasData = depts.length > 0 && totalResponses > 0

  const questionHealthIndexByQuestionId = new Map(
    aggregatedQuestions.map((q) => [q.id, q.avgScore]),
  )

  const globalDistributions: QuestionDistDisplay[] = (() => {
    const map = new Map<number, QuestionDistDisplay>()
    for (const d of distributions) {
      const existing = map.get(d.questionOrder)
      if (!existing) {
        const storedHealthIndex = questionHealthIndexByQuestionId.get(d.questionId)
        map.set(d.questionOrder, {
          questionId: d.questionId,
          questionText: d.questionText,
          questionOrder: d.questionOrder,
          scoreDirection: d.scoreDirection,
          distribution: d.distribution.map((s) => ({ ...s })),
          ...(storedHealthIndex !== undefined ? { storedHealthIndex } : {}),
        })
      } else {
        for (const s of d.distribution) {
          const entry = existing.distribution.find((e) => e.score === s.score)
          if (entry) {
            entry.count += s.count
          } else {
            existing.distribution.push({ ...s })
          }
        }
      }
    }
    return [...map.values()].sort((a, b) => a.questionOrder - b.questionOrder)
  })()

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
          <div className="flex items-center gap-2">
            {review.status === "generated" && <PgrMarkReviewedButton reviewId={review.id} />}
            {review.status === "reviewed" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                <CheckCircle2 className="w-3 h-3" />
                Revisado
              </span>
            )}
            {hasData && <ScoreTrendIcon hi={globalAvg} />}
          </div>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Índice de Saúde Global</p>
                    <p className={`text-2xl font-black font-mono mt-0.5 ${scoreColor(globalAvg)}`}>{globalAvg}%</p>
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
                          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Índice de Saúde</p>
                          <p className={`text-xl font-black font-mono ${scoreColor(bestQuestion.avgScore)}`}>{bestQuestion.avgScore}%</p>
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
                          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Índice de Saúde</p>
                          <p className={`text-xl font-black font-mono ${scoreColor(worstQuestion.avgScore)}`}>{worstQuestion.avgScore}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <ChartCard title="Índice de Saúde por Departamento" subtitle="Linhas de referência: saudável (62%) e crítico (37%)">
                  <PgrScoreComparisonChart depts={deptOverviewData} />
                </ChartCard>
                <ChartCard title="Adesão por Departamento" subtitle="Linha de referência: meta mínima (80%)">
                  <PgrAdherenceComparisonChart depts={deptOverviewData} />
                </ChartCard>
              </div>

              {globalDistributions.length > 0 && (
                <ChartCard title="Distribuição de Notas — Visão Geral" subtitle="Frequência de cada nota (1–5) por pergunta, consolidado de todos os setores" bodyClassName="">
                  <PgrScoreDistributionWidget distributions={globalDistributions} />
                </ChartCard>
              )}
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
                    avgScore: toHealthIndex(q.avgScore),
                    scoreDirection: q.scoreDirection as ScoreDirection,
                    order: q.questionOrder,
                    responseCount: q.responseCount,
                  }))

                const deptAdherencePct =
                  dept.totalRecipients > 0 ? Math.round((dept.responseCount / dept.totalRecipients) * 100) : 0

                const deptHI = toHealthIndex(dept.avgScore)
                const healthyQs = deptQuestions.filter((q) => q.avgScore >= 62).length
                const warningQs = deptQuestions.filter((q) => q.avgScore >= 37 && q.avgScore < 62).length
                const criticalQs = deptQuestions.filter((q) => q.avgScore > 0 && q.avgScore < 37).length

                const bestDeptQuestion = deptQuestions.length > 0
                  ? [...deptQuestions].sort((a, b) => b.avgScore - a.avgScore)[0]
                  : null
                const worstDeptQuestion = deptQuestions.length > 0
                  ? [...deptQuestions].sort((a, b) => a.avgScore - b.avgScore)[0]
                  : null

                return (
                  <PgrDeptAccordionItem
                    key={dept.id}
                    id={dept.id}
                    name={dept.departmentName}
                    healthIndex={deptHI}
                    gauge={<ScoreGauge hi={deptHI} />}
                  >

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
                                Melhor: <span className="font-bold text-green-600 dark:text-green-500">P{bestDeptQuestion.order} ({bestDeptQuestion.avgScore}%)</span>
                              </span>
                            )}
                            {worstDeptQuestion && (
                              <span className="text-[10px] text-muted-foreground">
                                Pior: <span className={`font-bold ${scoreColor(worstDeptQuestion.avgScore)}`}>P{worstDeptQuestion.order} ({worstDeptQuestion.avgScore}%)</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {deptQuestions.length > 0 && (() => {
                      const deptDistributions: QuestionDistDisplay[] = distributions
                        .filter((d) => d.departmentId === dept.departmentId)
                        .map((d) => ({
                          questionId: d.questionId,
                          questionText: d.questionText,
                          questionOrder: d.questionOrder,
                          scoreDirection: d.scoreDirection,
                          distribution: d.distribution,
                        }))
                        .sort((a, b) => a.questionOrder - b.questionOrder)

                      return (
                        <>
                          <div className="grid grid-cols-2 divide-x divide-border">
                            <div className="p-5">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Índice de Saúde por Pergunta</p>
                              <PgrDeptQuestionsChart questions={deptQuestions} />
                            </div>
                            <div className="divide-y divide-border">
                              {[...deptQuestions].sort((a, b) => a.order - b.order).map((q, i) => (
                                <div key={q.id} className={`px-4 py-3 grid grid-cols-[24px_1fr_auto] gap-3 items-center ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                                  <span className="text-[10px] font-black text-muted-foreground">P{q.order}</span>
                                  <p className="text-xs text-foreground leading-snug">{q.text}</p>
                                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Índice de Saúde</span>
                                    <span className={`text-base font-black font-mono ${scoreColor(q.avgScore)}`}>{q.avgScore}%</span>
                                    <span className="text-[9px] text-muted-foreground">{q.responseCount} resp.</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {deptDistributions.length > 0 && (
                            <div className="border-t border-border">
                              <PgrScoreDistributionWidget distributions={deptDistributions} />
                            </div>
                          )}
                        </>
                      )
                    })()}

                    {deptQuestions.length === 0 && (
                      <div className="px-5 py-6 text-center">
                        <p className="text-xs text-muted-foreground">Nenhuma resposta para este departamento neste período.</p>
                      </div>
                    )}
                  </PgrDeptAccordionItem>
                )
              })}
            </div>
          }
          consolidated={
            <div className="border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Consolidado de Departamentos</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Todos os {depts.length} departamentos — ordenado por Índice de Saúde (menor primeiro)</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Departamento</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funcionários</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                      Responderam
                      <span className="block text-[8px] font-normal normal-case tracking-normal text-muted-foreground/70">de enviados</span>
                    </th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                      Índice de Saúde
                      <span className="block text-[8px] font-normal normal-case tracking-normal text-muted-foreground/70">≥62% saud. · 37–61% aten. · &lt;37% crít.</span>
                    </th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                      Perguntas
                      <span className="block text-[8px] font-normal normal-case tracking-normal text-muted-foreground/70">
                        <span className="text-green-600 dark:text-green-500">saud.</span>
                        {" · "}
                        <span className="text-amber-600 dark:text-amber-500">aten.</span>
                        {" · "}
                        <span className="text-red-600 dark:text-red-500">crít.</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...depts].sort((a, b) => a.avgScore - b.avgScore).map((dept, i) => {
                    const rate = dept.totalRecipients > 0 ? Math.round((dept.responseCount / dept.totalRecipients) * 100) : 0
                    const dq = allQuestions.filter((q) => q.departmentId === dept.departmentId)
                    const hq = dq.filter((q) => toHealthIndex(q.avgScore) >= 62).length
                    const wq = dq.filter((q) => { const qhi = toHealthIndex(q.avgScore); return qhi >= 37 && qhi < 62 }).length
                    const cq = dq.filter((q) => toHealthIndex(q.avgScore) < 37).length
                    const hi = toHealthIndex(dept.avgScore)
                    return (
                      <tr key={dept.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                        <td className="px-4 py-3 font-medium text-xs">{dept.departmentName}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground text-center font-mono">{dept.employeeCount}</td>
                        <td className="px-4 py-3 text-xs text-center font-mono">
                          <span className="font-bold text-foreground">{dept.responseCount}</span>
                          <span className="text-muted-foreground"> de {dept.totalRecipients}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${adherenceBg(rate)}`} style={{ width: `${Math.min(rate, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-mono font-bold ${adherenceColor(rate)}`}>{rate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${scoreBg(hi)}`} style={{ width: `${Math.min(hi, 100)}%` }} />
                              </div>
                              <span className={`text-xs font-mono font-bold ${scoreColor(hi)}`}>{hi}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-green-600 dark:text-green-500 font-bold">{hq}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-amber-600 dark:text-amber-500 font-bold">{wq}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-red-600 dark:text-red-500 font-bold">{cq}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-border bg-muted/20 flex flex-wrap gap-x-6 gap-y-1">
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-bold">Responderam de enviados:</span> quantidade de colaboradores que responderam a pesquisa em relação ao total que recebeu o link. Participação é voluntária, por isso o número pode ser menor.
                </p>
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-bold">Perguntas</span> (<span className="text-green-600 dark:text-green-500 font-bold">saudável</span> · <span className="text-amber-600 dark:text-amber-500 font-bold">atenção</span> · <span className="text-red-600 dark:text-red-500 font-bold">crítico</span>): quantas perguntas do questionário deste setor estão em cada nível de saúde.
                </p>
              </div>
            </div>
          }
        />
      )}
    </div>
  )
}
