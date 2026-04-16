import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getAlerts } from "@/modules/alerts/alert.service"
import { getTotalEmployeeCount } from "@/modules/employees/employee.service"
import { getDispatches } from "@/modules/surveys/survey.service"

export default async function DashboardPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const [totalEmployees, recentAlerts, recentDispatches] = await Promise.all([
    getTotalEmployeeCount(session.tenantId),
    getAlerts(session.tenantId),
    getDispatches(session.tenantId),
  ])

  const unreadAlerts = recentAlerts.filter((a) => !a.isRead).length
  const criticalAlerts = recentAlerts.filter((a) => a.severity === "critical" && !a.resolvedAt)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <h1 className="text-sm font-bold uppercase tracking-widest">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Visao geral do sistema</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="grid grid-cols-3 gap-0 border border-border bg-card">
          {[
            { label: "Colaboradores ativos", value: totalEmployees, accent: "text-primary" },
            { label: "Alertas nao lidos", value: unreadAlerts, accent: unreadAlerts > 0 ? "text-destructive" : "text-foreground" },
            { label: "Pesquisas disparadas", value: recentDispatches.length, accent: "text-foreground" },
          ].map((kpi, i) => (
            <div key={kpi.label} className={`px-5 py-4 ${  i < 2 ? "border-r border-border" : ""}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
              <p className={`text-3xl font-black ${  kpi.accent}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest">Alertas recentes</span>
            <span className="text-[10px] text-muted-foreground">{criticalAlerts.length} criticos</span>
          </div>
          {recentAlerts.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">Nenhum alerta.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {recentAlerts.slice(0, 6).map((alert) => (
                  <tr key={alert.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${  alert.severity === "critical" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted text-muted-foreground border-border"}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{alert.message}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${  alert.isRead ? "bg-muted text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/20"}`}>
                        {alert.isRead ? "lido" : "novo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
