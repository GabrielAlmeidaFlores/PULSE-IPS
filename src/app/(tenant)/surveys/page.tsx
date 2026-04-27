import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getDispatches, type DispatchWithConfig } from "@/modules/surveys/survey-dashboard.service"
import { getSurveyConfigs } from "@/modules/surveys/survey-config.service"
import { format } from "date-fns"
import { ScheduleDispatchButton } from "@/app/(tenant)/surveys/schedule-dispatch-button"
import { PageHelp } from "@/components/page-help"
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react"

const STATUS_PRIORITY: Record<string, number> = {
  failed: 0,
  scheduled: 1,
  sent: 2,
  cancelled: 3,
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground border-border",
  sent: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  sent: "Enviado",
  cancelled: "Cancelado",
  failed: "Falhou",
}

function adherenceColor(rate: number): string {
  if (rate >= 0.8) return "bg-green-500"
  if (rate >= 0.5) return "bg-yellow-500"
  return "bg-red-500"
}

interface DayGroup {
  dayKey: string
  scheduledAt: Date
  anchorId: string
  totalRecipients: number
  totalResponses: number
  status: string
  deptCount: number
}

function groupDispatchesByDay(dispatches: DispatchWithConfig[]): DayGroup[] {
  const buckets = new Map<string, DayGroup>()

  for (const d of dispatches) {
    const dayKey = format(new Date(d.scheduledAt), "yyyy-MM-dd")
    const existing = buckets.get(dayKey)

    if (existing) {
      existing.totalRecipients += d.totalRecipients
      existing.totalResponses += d.totalResponses
      existing.deptCount += 1
      const currentPriority = STATUS_PRIORITY[existing.status] ?? 3
      const newPriority = STATUS_PRIORITY[d.status] ?? 3
      if (newPriority < currentPriority) existing.status = d.status
    } else {
      buckets.set(dayKey, {
        dayKey,
        scheduledAt: new Date(d.scheduledAt),
        anchorId: d.id,
        totalRecipients: d.totalRecipients,
        totalResponses: d.totalResponses,
        status: d.status,
        deptCount: 1,
      })
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  )
}

export default async function SurveysPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const [dispatches, configs] = await Promise.all([
    getDispatches(session.tenantId),
    getSurveyConfigs(session.tenantId),
  ])

  const dayGroups = groupDispatchesByDay(dispatches)
  const totalResponses = dispatches.reduce((s, d) => s + d.totalResponses, 0)
  const totalSent = dispatches.reduce((s, d) => s + d.totalRecipients, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Pesquisas</h1>
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">O que são as pesquisas?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Pesquisas rápidas e anônimas enviadas automaticamente por SMS/WhatsApp para os colaboradores. Cada respondente avalia de 1 a 5 fatores como carga de trabalho, clima, reconhecimento e saúde emocional. Levam menos de 2 minutos para responder.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status de um disparo</p>
                  <ul className="text-[12px] text-foreground leading-relaxed space-y-1 list-none">
                    <li>🕐 <strong>Agendado</strong> — aguardando o horário de envio</li>
                    <li>✅ <strong>Enviado</strong> — mensagens disparadas; respostas sendo coletadas</li>
                    <li>❌ <strong>Falhou</strong> — erro no envio; verifique os alertas</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Taxa de adesão</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Percentual de colaboradores que responderam. Taxa abaixo de <strong>80%</strong> após 48h gera um alerta automático de baixa adesão. O RH pode reenviar o link para quem ainda não respondeu.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Anonimato garantido</p>
                  <p className="text-[12px] text-foreground leading-relaxed">As respostas <strong>não são vinculadas ao colaborador</strong>. O sistema exibe métricas por setor somente quando há 5 ou mais respondentes — nunca é possível identificar quem respondeu o quê.</p>
                </div>
              </div>
            } />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dayGroups.length} rodadas · {totalResponses} respostas de {totalSent} enviados
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
          <ScheduleDispatchButton hasConfigs={configs.length > 0} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {configs.length === 0 && (
          <div className="border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-3 mb-6">
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

        {dayGroups.length > 0 && (
          <div className="border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Data
                  </th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Departamentos
                  </th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Respostas
                  </th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Adesão
                  </th>
                  <th className="px-5 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {dayGroups.map((g, i) => {
                  const notResponded = Math.max(0, g.totalRecipients - g.totalResponses)
                  const adherenceRate = g.totalRecipients > 0 ? g.totalResponses / g.totalRecipients : 0
                  const adhPct = Math.round(adherenceRate * 100)

                  return (
                    <tr
                      key={g.dayKey}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors group ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <Link href={`/surveys/${g.anchorId}`} className="block font-mono text-xs text-foreground">
                          {format(g.scheduledAt, "dd/MM/yyyy")}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/surveys/${g.anchorId}`} className="block text-xs text-muted-foreground">
                          {g.deptCount} {g.deptCount === 1 ? "departamento" : "departamentos"}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/surveys/${g.anchorId}`} className="block">
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${STATUS_STYLE[g.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                            {STATUS_LABELS[g.status] ?? g.status}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/surveys/${g.anchorId}`} className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="font-bold text-foreground">{g.totalResponses}</span>
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <XCircle className="h-3 w-3 text-red-400" />
                            <span className="font-bold text-foreground">{notResponded}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/surveys/${g.anchorId}`} className="block">
                          {g.totalRecipients > 0 ? (
                            <div className="flex flex-col gap-1 w-24">
                              <div className="flex items-center justify-between">
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
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/surveys/${g.anchorId}`} className="block">
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </Link>
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
