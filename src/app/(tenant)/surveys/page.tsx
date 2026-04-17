import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getDispatches, getSurveyConfigs, type DispatchWithConfig } from "@/modules/surveys/survey.service"
import { format } from "date-fns"
import { ScheduleDispatchButton } from "@/app/(tenant)/surveys/schedule-dispatch-button"
import { PageHelp } from "@/components/page-help"
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react"

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

function adherenceColor(rate: number): string {
  if (rate >= 0.8) return "bg-green-500"
  if (rate >= 0.5) return "bg-yellow-500"
  return "bg-red-500"
}

function groupByDepartment(dispatches: DispatchWithConfig[]): Map<string, { name: string; items: DispatchWithConfig[] }> {
  const groups = new Map<string, { name: string; items: DispatchWithConfig[] }>()
  for (const d of dispatches) {
    const deptId = d.surveyConfiguration.departmentId
    const existing = groups.get(deptId)
    if (existing) {
      existing.items.push(d)
    } else {
      groups.set(deptId, { name: d.surveyConfiguration.department.name, items: [d] })
    }
  }
  return groups
}

export default async function SurveysPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const [dispatches, configs] = await Promise.all([
    getDispatches(session.tenantId),
    getSurveyConfigs(session.tenantId),
  ])

  const configOptions = configs.map((c) => ({
    id: c.id,
    departmentName: c.department.name,
  }))

  const grouped = groupByDepartment(dispatches)
  const totalDispatches = dispatches.length
  const totalResponses = dispatches.reduce((s, d) => s + d.totalResponses, 0)
  const totalSent = dispatches.reduce((s, d) => s + d.totalRecipients, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Pesquisas</h1>
            <PageHelp text="Histórico de pesquisas de bem-estar enviadas aos colaboradores. Cada linha representa um disparo — clique para ver o dashboard completo com scores, distribuição de notas e taxa de adesão por pergunta." />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalDispatches} disparos · {totalResponses} respostas de {totalSent} enviados
          </p>
        </div>
        <div className="flex gap-0">
          <Link
            href="/surveys/configure"
            className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            style={{ borderRadius: 0 }}
          >
            Configurar
          </Link>
          <ScheduleDispatchButton configs={configOptions} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {configs.length === 0 && (
          <div className="border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-3">
            <span className="text-primary text-lg leading-none mt-0.5">ⓘ</span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Nenhuma pesquisa configurada</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure uma pesquisa para ao menos um departamento antes de agendar disparos.{" "}
                <Link href="/surveys/configure" className="text-primary hover:underline font-medium">
                  Configurar agora →
                </Link>
              </p>
            </div>
          </div>
        )}

        {dispatches.length === 0 && configs.length > 0 && (
          <div className="border border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhuma pesquisa disparada ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Agende um disparo manual ou aguarde o envio automático.</p>
          </div>
        )}

        {grouped.size > 0 && Array.from(grouped.entries()).map(([deptId, group]) => (
          <div key={deptId} className="border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest">{group.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{group.items.length} disparo{group.items.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total respostas</p>
                  <p className="text-sm font-black text-foreground">
                    {group.items.reduce((s, d) => s + d.totalResponses, 0)}
                    <span className="text-muted-foreground font-normal"> / {group.items.reduce((s, d) => s + d.totalRecipients, 0)}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border">
              {group.items.map((d) => {
                const notResponded = Math.max(0, d.totalRecipients - d.totalResponses)
                const adherenceRate = d.totalRecipients > 0 ? d.totalResponses / d.totalRecipients : 0
                const adhPct = Math.round(adherenceRate * 100)

                return (
                  <Link
                    key={d.id}
                    href={`/surveys/${d.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-mono text-foreground">
                          {format(new Date(d.scheduledAt), "dd/MM/yyyy HH:mm")}
                        </p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${STATUS_STYLE[d.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                          {STATUS_LABELS[d.status] ?? d.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[11px]">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="font-bold text-foreground">{d.totalResponses}</span> responderam
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="h-3 w-3 text-red-400" />
                          <span className="font-bold text-foreground">{notResponded}</span> não responderam
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {d.totalRecipients > 0 && (
                        <div className="flex flex-col items-end gap-1 w-28">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Adesão</span>
                            <span className="text-[10px] font-bold">{adhPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all ${adherenceColor(adherenceRate)}`}
                              style={{ width: `${adhPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
