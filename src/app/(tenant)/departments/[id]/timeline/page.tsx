import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getDepartment } from "@/modules/departments/department.service"
import { getDispatches } from "@/modules/surveys/survey.service"

interface Props {
  params: Promise<{ id: string }>
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const map: Record<string, string> = {
    sent: "bg-primary/10 text-primary border-primary/20",
    scheduled: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    cancelled: "bg-muted text-muted-foreground border-border",
    dispatched: "bg-primary/10 text-primary border-primary/20",
  }
  const cls = map[status] ?? "bg-muted text-muted-foreground border-border"
  const labels: Record<string, string> = {
    sent: "Enviado",
    scheduled: "Agendado",
    failed: "Falhou",
    cancelled: "Cancelado",
    dispatched: "Disparado",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default async function DepartmentTimelinePage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const [department, allDispatches] = await Promise.all([
    getDepartment(session.tenantId, id),
    getDispatches(session.tenantId),
  ])

  if (!department) notFound()

  const dispatches = allDispatches.filter((d) => d.surveyConfiguration.departmentId === id)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3 shrink-0">
        <Link
          href="/departments"
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Setores
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-sm font-bold uppercase tracking-widest">{department.name}</h1>
        <span className="text-muted-foreground">/</span>
        <span className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">Linha do Tempo</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {dispatches.length === 0 ? (
          <div className="border border-border bg-card px-4 py-10 text-center text-muted-foreground text-[11px] tracking-wide">
            Nenhuma pesquisa disparada para este setor ainda.
          </div>
        ) : (
          <div className="border border-border bg-card">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Agendado para</th>
                  <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Enviado em</th>
                  <th className="text-center px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Destinatários</th>
                  <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Respostas</th>
                  <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Aderência</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((dispatch, i) => {
                  const adherence =
                    dispatch.totalRecipients !== null && dispatch.totalRecipients > 0
                      ? Math.round((dispatch.totalResponses / dispatch.totalRecipients) * 100)
                      : null
                  return (
                    <tr
                      key={dispatch.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{formatDate(dispatch.scheduledAt)}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {dispatch.dispatchedAt !== null ? formatDate(dispatch.dispatchedAt) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={dispatch.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {dispatch.totalRecipients ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{dispatch.totalResponses}</td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {adherence !== null ? (
                          <span className={adherence >= 80 ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                            {adherence}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="border-t border-border px-4 py-2">
              <span className="text-[10px] text-muted-foreground">{dispatches.length} registros</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
