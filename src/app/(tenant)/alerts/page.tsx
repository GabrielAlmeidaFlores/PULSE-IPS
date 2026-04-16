import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getAlerts } from "@/modules/alerts/alert.service"
import { format } from "date-fns"
import { AlertRowActions } from "@/app/(tenant)/alerts/alert-row-actions"

export default async function AlertsPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const alerts = await getAlerts(session.tenantId)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <h1 className="text-sm font-bold uppercase tracking-widest">Alertas</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{alerts.length} alertas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Severidade</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mensagem</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum alerta.</td></tr>
              )}
              {alerts.map((alert, i) => (
                <tr key={alert.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${  i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{alert.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${  alert.severity === "critical" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted text-muted-foreground border-border"}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-xs">{alert.message}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{format(new Date(alert.createdAt), "dd/MM HH:mm")}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      let statusCls: string
                      if (alert.resolvedAt) {
                        statusCls = "bg-primary/10 text-primary border-primary/20"
                      } else if (alert.isRead) {
                        statusCls = "bg-muted text-muted-foreground border-border"
                      } else {
                        statusCls = "bg-amber-50 text-amber-700 border-amber-200"
                      }
                      let statusLabel: string
                      if (alert.resolvedAt) {
                        statusLabel = "resolvido"
                      } else if (alert.isRead) {
                        statusLabel = "lido"
                      } else {
                        statusLabel = "novo"
                      }
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusCls}`}>
                          {statusLabel}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AlertRowActions alertId={alert.id} isRead={alert.isRead} isResolved={Boolean(alert.resolvedAt)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
