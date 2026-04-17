import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getDispatchDashboard, getDispatches, type DispatchWithConfig } from "@/modules/surveys/survey.service"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Users, CheckCircle2, XCircle, Activity, BarChart2, TrendingUp } from "lucide-react"
import { QuestionScoreChart, ScoreDistributionBar, AdherenceGauge, DeptTrendChart, type TrendPoint } from "@/app/(tenant)/surveys/[dispatchId]/components/dispatch-charts"
import { DeptFilter } from "@/app/(tenant)/surveys/[dispatchId]/components/dept-filter"

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

export default async function DispatchDetailPage({ params, searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const { dispatchId } = await params
  const resolvedSearch = await searchParams

  const [stats, allDispatches] = await Promise.all([
    getDispatchDashboard(session.tenantId, dispatchId),
    getDispatches(session.tenantId),
  ])
  if (!stats) notFound()

  //Latest dispatch per department
  const latestPerDept = new Map<string, DispatchWithConfig>()
  for (const d of allDispatches) {
    const deptId = d.surveyConfiguration.departmentId
    const existing = latestPerDept.get(deptId)
    if (!existing || new Date(d.scheduledAt) > new Date(existing.scheduledAt)) {
      latestPerDept.set(deptId, d)
    }
  }

  //All department options (for filter component)
  const allDeptOptions = Array.from(latestPerDept.entries()).map(([id, d]) => ({
    id,
    name: d.surveyConfiguration.department.name,
  }))

  //Parse selected dept IDs from URL (nuqs format: comma-separated in "depts" param)
  const rawDepts = resolvedSearch.depts
  const selectedIds = (Array.isArray(rawDepts) ? rawDepts : rawDepts?.split(",").filter(Boolean) ?? [])
    .filter(Boolean)

  //Dispatches to aggregate: filter by selected depts or show all
  const aggrDispatches = selectedIds.length > 0
    ? Array.from(latestPerDept.entries())
        .filter(([id]) => selectedIds.includes(id))
        .map(([, d]) => d)
    : Array.from(latestPerDept.values())

  //Aggregated KPIs across filtered departments
  const aggrRecipients = aggrDispatches.reduce((s, d) => s + d.totalRecipients, 0)
  const aggrResponses = aggrDispatches.reduce((s, d) => s + d.totalResponses, 0)
  const aggrNotResponded = Math.max(0, aggrRecipients - aggrResponses)
  const aggrAdherence = aggrRecipients > 0 ? aggrResponses / aggrRecipients : 0

  //Per-dept breakdown (sorted by name)
  const deptBreakdown = aggrDispatches
    .map((d) => ({
      id: d.surveyConfiguration.departmentId,
      name: d.surveyConfiguration.department.name,
      dispatchId: d.id,
      recipients: d.totalRecipients,
      responses: d.totalResponses,
      adherence: d.totalRecipients > 0 ? Math.round((d.totalResponses / d.totalRecipients) * 100) : 0,
      isAnchor: d.surveyConfiguration.departmentId === stats.departmentId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  //Dispatches for anchor department history (trend chart)
  const anchorDeptDispatches = allDispatches
    .filter((d: DispatchWithConfig) => d.surveyConfiguration.departmentId === stats.departmentId)
    .sort((a: DispatchWithConfig, b: DispatchWithConfig) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )

  const trendData: TrendPoint[] = anchorDeptDispatches.map((d: DispatchWithConfig) => ({
    date: format(new Date(d.scheduledAt), "dd/MM"),
    adherence: d.totalRecipients > 0 ? Math.round((d.totalResponses / d.totalRecipients) * 100) : 0,
    dispatchId: d.id,
  }))

  const hasAnchorResponses = stats.totalResponses > 0
  const showMultipleDepts = aggrDispatches.length > 1

  return (
    <div className="flex flex-col h-full">
      {/*Header */}
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/surveys" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold uppercase tracking-widest">Dashboard de Pesquisas</h1>
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLE[stats.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                  {STATUS_LABELS[stats.status] ?? stats.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.departmentName}
                {" · "}{format(new Date(stats.scheduledAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                {" · "}{FREQUENCY_LABELS[stats.frequency] ?? stats.frequency}
              </p>
            </div>
          </div>
          {allDeptOptions.length > 1 && (
            <DeptFilter departments={allDeptOptions} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/*Aggregated KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-border bg-card">
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Enviados</p>
            </div>
            <p className="text-3xl font-black text-primary">{aggrRecipients}</p>
            {showMultipleDepts && <p className="text-[10px] text-muted-foreground mt-0.5">{aggrDispatches.length} departamentos</p>}
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responderam</p>
            </div>
            <p className="text-3xl font-black text-green-600">{aggrResponses}</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Não responderam</p>
            </div>
            <p className="text-3xl font-black text-red-500">{aggrNotResponded}</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão geral</p>
            </div>
            <p className={`text-3xl font-black ${adherenceClass(Math.round(aggrAdherence * 100))}`}>
              {Math.round(aggrAdherence * 100)}%
            </p>
          </div>
        </div>

        {/*Per-department breakdown (shown when multiple depts) */}
        {showMultipleDepts && (
          <div className="border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão por departamento</p>
            </div>
            <div className="divide-y divide-border">
              {deptBreakdown.map((dept) => {
                const adhPct = dept.adherence
                const barColor = adherenceBarClass(adhPct)
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
                        <div className={`h-full ${barColor}`} style={{ width: `${adhPct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px]">
                      <span className="text-muted-foreground">{dept.responses}/{dept.recipients}</span>
                      <span className={`font-black w-10 text-right ${adherenceClass(adhPct)}`}>{adhPct}%</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/*Single-dept view: adherence gauge + question chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-border bg-card p-5 flex flex-col items-center justify-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Taxa de adesão</p>
            <AdherenceGauge rate={showMultipleDepts ? aggrAdherence : stats.adherenceRate} />
            <p className="text-xs text-muted-foreground text-center">
              {showMultipleDepts
                ? `${aggrResponses} de ${aggrRecipients} responderam`
                : `${stats.totalResponses} de ${stats.totalRecipients} responderam`}
            </p>
            {aggrAdherence < 0.5 && aggrRecipients > 0 && (
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">⚠ Adesão crítica</p>
            )}
          </div>

          <div className="md:col-span-2 border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score médio por pergunta</p>
              <span className="ml-auto text-[10px] text-muted-foreground">{stats.departmentName}</span>
            </div>
            {hasAnchorResponses ? (
              <div className="mt-3">
                <QuestionScoreChart stats={stats} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma resposta registrada ainda para este departamento.</p>
            )}
          </div>
        </div>

        {/*Score distribution for anchor dispatch */}
        {hasAnchorResponses && (
          <div className="border border-border bg-card">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Distribuição de notas — {stats.departmentName}</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-sm font-black ${scoreAccentClass(stats.avgScore)}`}>{stats.avgScore?.toFixed(2) ?? "—"}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${scoreAccentClass(stats.avgScore)}`}>{scoreLabel(stats.avgScore)}</span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {stats.questions.map((q) => (
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

        {!hasAnchorResponses && (
          <div className="border border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Aguardando respostas</p>
            <p className="text-xs text-muted-foreground mt-1">Os dados de score aparecerão aqui conforme os colaboradores responderem a pesquisa.</p>
          </div>
        )}

        {/*Historical trend for anchor department */}
        {trendData.length > 0 && (
          <div className="border border-border bg-card">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Histórico de adesão — {stats.departmentName}
              </p>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {anchorDeptDispatches.length} disparo{anchorDeptDispatches.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="px-5 py-4">
              <DeptTrendChart data={trendData} currentId={stats.id} />
            </div>
            <div className="border-t border-border divide-y divide-border">
              {[...anchorDeptDispatches].reverse().slice(0, 5).map((d: DispatchWithConfig) => {
                const adh = d.totalRecipients > 0 ? Math.round((d.totalResponses / d.totalRecipients) * 100) : 0
                const isCurrent = d.id === stats.id
                return (
                  <Link
                    key={d.id}
                    href={`/surveys/${d.id}`}
                    className={`flex items-center justify-between px-5 py-2.5 text-[11px] hover:bg-muted/30 transition-colors ${isCurrent ? "bg-primary/5" : ""}`}
                  >
                    <span className={`font-mono ${isCurrent ? "font-bold text-primary" : "text-muted-foreground"}`}>
                      {format(new Date(d.scheduledAt), "dd/MM/yyyy HH:mm")}
                      {isCurrent && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider">← atual</span>}
                    </span>
                    <span className={`font-bold ${adherenceClass(adh)}`}>{adh}%</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
