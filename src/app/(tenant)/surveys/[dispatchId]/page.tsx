import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getDispatchDashboard, getDispatches, getMultipleDispatchDashboards, type DispatchWithConfig } from "@/modules/surveys/survey.service"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Users, CheckCircle2, XCircle, Activity, BarChart2, TrendingUp } from "lucide-react"
import { QuestionScoreChart, ScoreDistributionBar, AdherenceGauge, DeptTrendChart, type TrendPoint } from "@/app/(tenant)/surveys/[dispatchId]/components/dispatch-charts"
import { DeptFilter } from "@/app/(tenant)/surveys/[dispatchId]/components/dept-filter"
import type { DispatchDashboardStats } from "@/modules/surveys/survey.types"

interface Props {
  params: Promise<{ dispatchId: string }>
  searchParams: Promise<{ depts?: string | string[] }>
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diária",
  twice_weekly: "2x por semana",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground border-border",
  dispatched: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  dispatched: "Enviado",
  completed: "Concluído",
  failed: "Falhou",
}

interface MergedStatsBase {
  id: string
  departmentId: string
  status: string
  scheduledAt: Date
  dispatchedAt: Date | null
  frequency: string
  departmentName: string
}

function mergeDispatchStats(statsArray: DispatchDashboardStats[], base: MergedStatsBase): DispatchDashboardStats {
  const totalRecipients = statsArray.reduce((s, d) => s + d.totalRecipients, 0)
  const totalResponses = statsArray.reduce((s, d) => s + d.totalResponses, 0)
  const notResponded = Math.max(0, totalRecipients - totalResponses)
  const adherenceRate = totalRecipients > 0 ? totalResponses / totalRecipients : 0

  const questionsByText = new Map<string, { id: string; text: string; order: number; distCounts: Map<number, number> }>()
  for (const deptStats of statsArray) {
    for (const q of deptStats.questions) {
      const existing = questionsByText.get(q.text)
      if (existing) {
        for (const d of q.distribution) {
          existing.distCounts.set(d.score, (existing.distCounts.get(d.score) ?? 0) + d.count)
        }
      } else {
        const distCounts = new Map<number, number>()
        for (const d of q.distribution) {
          distCounts.set(d.score, d.count)
        }
        questionsByText.set(q.text, { id: q.id, text: q.text, order: q.order, distCounts })
      }
    }
  }

  const questions = Array.from(questionsByText.values())
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      const distribution = [1, 2, 3, 4, 5].map((s) => ({ score: s, count: q.distCounts.get(s) ?? 0 }))
      const totalCount = distribution.reduce((s, d) => s + d.count, 0)
      const weightedSum = distribution.reduce((s, d) => s + d.score * d.count, 0)
      const avgScore = totalCount > 0 ? weightedSum / totalCount : null
      return { id: q.id, text: q.text, order: q.order, avgScore, distribution }
    })

  const questionAvgs = questions.map((q) => q.avgScore).filter((s): s is number => s !== null)
  const avgScore = questionAvgs.length > 0 ? questionAvgs.reduce((a, b) => a + b, 0) / questionAvgs.length : null

  return { ...base, totalRecipients, totalResponses, notResponded, adherenceRate, avgScore, questions }
}

function computeMergedLabel(selectedIds: string[], aggrStats: DispatchDashboardStats[]): string {
  if (selectedIds.length === 0) return "Todos os departamentos"
  if (aggrStats.length === 1) {
    const first = aggrStats[0]
    return first?.departmentName ?? "Departamento"
  }
  return `${aggrStats.length} departamentos`
}

function scoreAccentClass(avg: number | null): string {
  if (avg === null) return "text-muted-foreground"
  if (avg >= 3.5) return "text-green-600"
  if (avg >= 2.5) return "text-yellow-600"
  return "text-red-600"
}

function scoreLabel(avg: number | null): string {
  if (avg === null) return "—"
  if (avg >= 3.5) return "Saudável"
  if (avg >= 2.5) return "Atenção"
  return "Crítico"
}

function adherenceClass(rate: number): string {
  if (rate >= 80) return "text-green-600"
  if (rate >= 50) return "text-yellow-600"
  return "text-red-500"
}

function adherenceBarClass(pct: number): string {
  if (pct >= 80) return "bg-green-500"
  if (pct >= 50) return "bg-yellow-500"
  return "bg-red-500"
}

interface DeptChartSectionProps {
  deptStats: DispatchDashboardStats
}

function DeptChartSection({ deptStats }: DeptChartSectionProps): React.ReactElement {
  const hasResponses = deptStats.totalResponses > 0
  const deptAdherence = Math.round(deptStats.adherenceRate * 100)

  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold">{deptStats.departmentName}</h2>
          {deptStats.avgScore !== null && (
            <span className={`text-[10px] font-bold uppercase tracking-wider ${scoreAccentClass(deptStats.avgScore)}`}>
              {scoreLabel(deptStats.avgScore)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>{deptStats.totalResponses}/{deptStats.totalRecipients} respostas</span>
          <span className={`font-bold ${adherenceClass(deptAdherence)}`}>{deptAdherence}% adesão</span>
          {deptStats.avgScore !== null && (
            <span className={`font-black text-sm font-mono ${scoreAccentClass(deptStats.avgScore)}`}>
              {deptStats.avgScore.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="p-5 flex flex-col items-center justify-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Taxa de adesão</p>
          <AdherenceGauge rate={deptStats.adherenceRate} />
          <p className="text-xs text-muted-foreground text-center">
            {deptStats.totalResponses} de {deptStats.totalRecipients} responderam
          </p>
          {deptStats.adherenceRate < 0.5 && deptStats.totalRecipients > 0 && (
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">⚠ Adesão crítica</p>
          )}
        </div>

        <div className="md:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score médio por pergunta</p>
          </div>
          {hasResponses ? (
            <QuestionScoreChart stats={deptStats} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma resposta registrada ainda.</p>
          )}
        </div>
      </div>

      {hasResponses && (
        <div className="border-t border-border">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Distribuição de notas</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-sm font-black ${scoreAccentClass(deptStats.avgScore)}`}>{deptStats.avgScore?.toFixed(2) ?? "—"}</p>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${scoreAccentClass(deptStats.avgScore)}`}>{scoreLabel(deptStats.avgScore)}</span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {deptStats.questions.map((q) => (
              <div key={q.id} className="px-5 py-4 grid grid-cols-1 md:grid-cols-[auto_1fr_80px] gap-3 items-center">
                <div className="flex items-start gap-3 md:max-w-xs">
                  <span className="text-[10px] font-black text-muted-foreground shrink-0 mt-0.5 w-6">P{q.order}</span>
                  <p className="text-xs text-foreground leading-relaxed">{q.text}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <ScoreDistributionBar question={q} />
                  <div className="flex gap-1 flex-wrap">
                    {q.distribution.filter((d) => d.count > 0).map((d) => (
                      <span key={d.score} className="text-[9px] text-muted-foreground">
                        {d.score}★ {d.count}x
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  {q.avgScore !== null ? (
                    <>
                      <p className={`text-xl font-black ${scoreAccentClass(q.avgScore)}`}>{q.avgScore.toFixed(1)}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">média</p>
                    </>
                  ) : (
                    <p className="text-xl font-black text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function DispatchDetailPage({ params, searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const { dispatchId } = await params
  const resolvedSearch = await searchParams

  const [anchorStats, allDispatches] = await Promise.all([
    getDispatchDashboard(session.tenantId, dispatchId),
    getDispatches(session.tenantId),
  ])
  if (!anchorStats) notFound()

  const latestPerDept = new Map<string, DispatchWithConfig>()
  for (const d of allDispatches) {
    const deptId = d.surveyConfiguration.departmentId
    const existing = latestPerDept.get(deptId)
    if (!existing || new Date(d.scheduledAt) > new Date(existing.scheduledAt)) {
      latestPerDept.set(deptId, d)
    }
  }

  const allDeptOptions = Array.from(latestPerDept.entries()).map(([id, d]) => ({
    id,
    name: d.surveyConfiguration.department.name,
  }))

  const rawDepts = resolvedSearch.depts
  const selectedIds = (Array.isArray(rawDepts) ? rawDepts : rawDepts?.split(",").filter(Boolean) ?? []).filter(Boolean)

  const aggrDispatches =
    selectedIds.length > 0
      ? Array.from(latestPerDept.entries())
          .filter(([id]) => selectedIds.includes(id))
          .map(([, d]) => d)
      : Array.from(latestPerDept.values())

  const aggrStats = await getMultipleDispatchDashboards(
    session.tenantId,
    aggrDispatches.map((d) => d.id),
  )

  const mergedLabel = computeMergedLabel(selectedIds, aggrStats)
  const mergedStatsBase: MergedStatsBase = {
    id: anchorStats.id,
    departmentId: anchorStats.departmentId,
    status: anchorStats.status,
    scheduledAt: anchorStats.scheduledAt,
    dispatchedAt: anchorStats.dispatchedAt,
    frequency: anchorStats.frequency,
    departmentName: mergedLabel,
  }
  const mergedStats = mergeDispatchStats(aggrStats, mergedStatsBase)

  const deptBreakdown = aggrDispatches
    .map((d) => ({
      id: d.surveyConfiguration.departmentId,
      name: d.surveyConfiguration.department.name,
      dispatchId: d.id,
      recipients: d.totalRecipients,
      responses: d.totalResponses,
      adherence: d.totalRecipients > 0 ? Math.round((d.totalResponses / d.totalRecipients) * 100) : 0,
      isAnchor: d.surveyConfiguration.departmentId === anchorStats.departmentId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const historyDeptName = computeMergedLabel(selectedIds, aggrStats)

  const historyDeptIds = selectedIds.length > 0 ? selectedIds : Array.from(latestPerDept.keys())
  const relevantDispatches = allDispatches.filter((d: DispatchWithConfig) =>
    historyDeptIds.includes(d.surveyConfiguration.departmentId),
  )

  interface HistoryBucket {
    dayKey: string
    scheduledAt: Date
    totalRecipients: number
    totalResponses: number
    dispatchId: string | null
  }

  const historyBucketMap = new Map<string, HistoryBucket>()
  for (const d of relevantDispatches) {
    const dayKey = format(new Date(d.scheduledAt), "yyyy-MM-dd")
    const existing = historyBucketMap.get(dayKey)
    if (existing !== undefined) {
      existing.totalRecipients += d.totalRecipients
      existing.totalResponses += d.totalResponses
      existing.dispatchId = null
    } else {
      historyBucketMap.set(dayKey, {
        dayKey,
        scheduledAt: new Date(d.scheduledAt),
        totalRecipients: d.totalRecipients,
        totalResponses: d.totalResponses,
        dispatchId: d.id,
      })
    }
  }

  const sortedBuckets = Array.from(historyBucketMap.values()).sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey),
  )

  const anchorDayKey = format(new Date(anchorStats.scheduledAt), "yyyy-MM-dd")

  const trendData: TrendPoint[] = sortedBuckets.map((b) => ({
    date: format(b.scheduledAt, "dd/MM"),
    adherence: b.totalRecipients > 0 ? Math.round((b.totalResponses / b.totalRecipients) * 100) : 0,
    dispatchId: b.dayKey,
  }))

  const showMultipleDepts = aggrStats.length > 1

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/surveys" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold uppercase tracking-widest">Dashboard de Pesquisas</h1>
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLE[anchorStats.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                  {STATUS_LABELS[anchorStats.status] ?? anchorStats.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {anchorStats.departmentName}
                {" · "}{format(new Date(anchorStats.scheduledAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                {" · "}{FREQUENCY_LABELS[anchorStats.frequency] ?? anchorStats.frequency}
              </p>
            </div>
          </div>
          {allDeptOptions.length > 1 && (
            <DeptFilter departments={allDeptOptions} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-border bg-card">
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Enviados</p>
            </div>
            <p className="text-3xl font-black text-primary">{mergedStats.totalRecipients}</p>
            {showMultipleDepts && <p className="text-[10px] text-muted-foreground mt-0.5">{aggrStats.length} departamentos</p>}
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responderam</p>
            </div>
            <p className="text-3xl font-black text-green-600">{mergedStats.totalResponses}</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Não responderam</p>
            </div>
            <p className="text-3xl font-black text-red-500">{mergedStats.notResponded}</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão geral</p>
            </div>
            <p className={`text-3xl font-black ${adherenceClass(Math.round(mergedStats.adherenceRate * 100))}`}>
              {Math.round(mergedStats.adherenceRate * 100)}%
            </p>
          </div>
        </div>

        {showMultipleDepts && (
          <div className="border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão por departamento</p>
            </div>
            <div className="divide-y divide-border">
              {deptBreakdown.map((dept) => {
                const barColor = adherenceBarClass(dept.adherence)
                return (
                  <Link
                    key={dept.id}
                    href={`/surveys/${dept.dispatchId}`}
                    className={`flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors group ${dept.isAnchor ? "bg-primary/5" : ""}`}
                  >
                    <div className="w-36 shrink-0">
                      <p className={`text-xs font-bold truncate ${dept.isAnchor ? "text-primary" : "text-foreground"}`}>
                        {dept.name}
                        {dept.isAnchor && <span className="ml-1.5 text-[9px] font-bold text-primary/70">← atual</span>}
                      </p>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="w-full h-1.5 bg-muted overflow-hidden">
                        <div className={`h-full ${barColor}`} style={{ width: `${dept.adherence}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px]">
                      <span className="text-muted-foreground">{dept.responses}/{dept.recipients}</span>
                      <span className={`font-black w-10 text-right ${adherenceClass(dept.adherence)}`}>{dept.adherence}%</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <DeptChartSection deptStats={mergedStats} />

        {trendData.length > 0 && (
          <div className="border border-border bg-card">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Histórico de adesão — {historyDeptName}
              </p>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {sortedBuckets.length} disparo{sortedBuckets.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="px-5 py-4">
              <DeptTrendChart data={trendData} currentId={anchorDayKey} />
            </div>
            <div className="border-t border-border divide-y divide-border">
              {[...sortedBuckets].reverse().slice(0, 5).map((b) => {
                const adh = b.totalRecipients > 0 ? Math.round((b.totalResponses / b.totalRecipients) * 100) : 0
                const isCurrent = b.dayKey === anchorDayKey
                const rowContent = (
                  <>
                    <span className={`font-mono ${isCurrent ? "font-bold text-primary" : "text-muted-foreground"}`}>
                      {format(b.scheduledAt, "dd/MM/yyyy")}
                      {isCurrent && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider">← atual</span>}
                    </span>
                    <span className={`font-bold ${adherenceClass(adh)}`}>{adh}%</span>
                  </>
                )
                if (b.dispatchId !== null) {
                  return (
                    <Link
                      key={b.dayKey}
                      href={`/surveys/${b.dispatchId}`}
                      className={`flex items-center justify-between px-5 py-2.5 text-[11px] hover:bg-muted/30 transition-colors ${isCurrent ? "bg-primary/5" : ""}`}
                    >
                      {rowContent}
                    </Link>
                  )
                }
                return (
                  <div
                    key={b.dayKey}
                    className={`flex items-center justify-between px-5 py-2.5 text-[11px] ${isCurrent ? "bg-primary/5" : ""}`}
                  >
                    {rowContent}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
