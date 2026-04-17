import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getAlerts } from "@/modules/alerts/alert.service"
import { format } from "date-fns"
import { AlertRowActions } from "@/app/(tenant)/alerts/alert-row-actions"
import { PageHelp } from "@/components/page-help"

const BADGE_DEFAULT = "bg-muted text-muted-foreground border-border"
const BADGE_BASE = "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border"

const SEVERITY_LABELS: Record<string, string> = {
  info: "Informativo",
  warning: "Atenção",
  critical: "Crítico",
}

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 border-blue-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  critical: "bg-red-100 text-red-800 border-red-300",
}

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-blue-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
}

const TYPE_LABELS: Record<string, string> = {
  low_score: "Score baixo",
  no_response: "Sem resposta",
  consent_expired: "Consentimento expirado",
  billing: "Cobrança",
  system: "Sistema",
}

const TYPE_STYLE: Record<string, string> = {
  low_score: "bg-amber-100 text-amber-800 border-amber-300",
  no_response: "bg-red-100 text-red-800 border-red-300",
  consent_expired: BADGE_DEFAULT,
  billing: "bg-blue-100 text-blue-800 border-blue-300",
  system: BADGE_DEFAULT,
}

export default async function AlertsPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const alerts = await getAlerts(session.tenantId)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm font-bold uppercase tracking-widest">Alertas</h1>
          <PageHelp text="Notificações automáticas geradas quando o sistema detecta padrões preocupantes — como funcionários que nunca responderam pesquisas ou índices baixos de bem-estar. Cada alerta pode ser marcado como lido ou resolvido pela equipe de RH." />
        </div>
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
              {alerts.map((alert, i) => {
                let statusCls: string
                let statusLabel: string
                if (alert.resolvedAt) {
                  statusCls = "bg-green-100 text-green-800 border-green-300"
                  statusLabel = "resolvido"
                } else if (alert.isRead) {
                  statusCls = BADGE_DEFAULT
                  statusLabel = "lido"
                } else {
                  statusCls = "bg-amber-100 text-amber-800 border-amber-300"
                  statusLabel = "novo"
                }
                return (
                  <tr key={alert.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-3">
                      <span className={`${BADGE_BASE} ${TYPE_STYLE[alert.type] ?? BADGE_DEFAULT}`}>
                        {TYPE_LABELS[alert.type] ?? alert.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${SEVERITY_STYLE[alert.severity] ?? BADGE_DEFAULT}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[alert.severity] ?? "bg-muted-foreground"}`} />
                        {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-xs">{alert.message}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{format(new Date(alert.createdAt), "dd/MM HH:mm")}</td>
                    <td className="px-4 py-3">
                      <span className={`${BADGE_BASE} ${statusCls}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AlertRowActions alertId={alert.id} isRead={alert.isRead} isResolved={Boolean(alert.resolvedAt)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
