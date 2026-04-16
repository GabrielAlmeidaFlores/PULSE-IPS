import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getDispatches, getSurveyConfigs } from "@/modules/surveys/survey.service"
import { format } from "date-fns"
import { ScheduleDispatchButton } from "@/app/(tenant)/surveys/schedule-dispatch-button"
import { PageHelp } from "@/components/page-help"

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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Pesquisas</h1>
            <PageHelp text="Pesquisas de bem-estar enviadas automaticamente aos funcionários via WhatsApp ou SMS no horário de trabalho de cada equipe. O sistema dispara e coleta respostas sem intervenção manual. Configure a frequência e os horários por departamento em 'Configurar'. Aqui você acompanha o histórico de envios e taxas de resposta." />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{dispatches.length} disparos · {configs.length} configurações</p>
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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Departamento</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agendado</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destinatários</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Respostas</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma pesquisa disparada.</td></tr>
              )}
              {dispatches.map((d, i) => (
                <tr key={d.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${  i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3">{d.surveyConfiguration.department.name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{format(new Date(d.scheduledAt), "dd/MM/yyyy HH:mm")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${  d.status === "dispatched" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{d.totalRecipients}</td>
                  <td className="px-4 py-3 text-right font-mono">{d.totalResponses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


