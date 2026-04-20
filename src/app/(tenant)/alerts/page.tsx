import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getAlerts } from "@/modules/alerts/alert.service"
import { format } from "date-fns"
import { AlertRowActions } from "@/app/(tenant)/alerts/alert-row-actions"
import { PageHelp } from "@/components/page-help"
import { AlertTypeInfo } from "@/components/alert-type-info"
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react"

const BADGE_DEFAULT = "bg-muted text-muted-foreground border-border"
const BADGE_RED = "bg-red-100 text-red-800 border-red-300"
const BADGE_BASE = "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border"

const SEVERITY_LABELS: Record<string, string> = {
  info: "Informativo",
  warning: "Atenção",
  critical: "Crítico",
}

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 border-blue-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  critical: BADGE_RED,
}

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-blue-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
}

const TYPE_LABELS: Record<string, string> = {
  score_drop: "Queda no bem-estar",
  low_score: "Bem-estar abaixo do esperado",
  pgr_review_due: "Revisão PGR pendente",
  negative_trend: "Tendência de piora persistente",
  low_adherence: "Adesão baixa",
  no_response: "Sem resposta",
  consent_expired: "Consentimento expirado",
  billing: "Cobrança",
  system: "Sistema",
  crisis_report: "Relato de crise",
}

const TYPE_STYLE: Record<string, string> = {
  score_drop: BADGE_RED,
  low_score: "bg-amber-100 text-amber-800 border-amber-300",
  pgr_review_due: "bg-blue-100 text-blue-800 border-blue-300",
  negative_trend: BADGE_RED,
  low_adherence: "bg-yellow-100 text-yellow-800 border-yellow-300",
  no_response: BADGE_RED,
  consent_expired: BADGE_DEFAULT,
  billing: "bg-blue-100 text-blue-800 border-blue-300",
  system: BADGE_DEFAULT,
  crisis_report: BADGE_RED,
}

function resolutionRateColor(rate: number): string {
  if (rate >= 80) return "text-green-600"
  if (rate >= 50) return "text-amber-600"
  return "text-foreground"
}

export default async function AlertsPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const alerts = await getAlerts(session.tenantId)

  const unresolved = alerts.filter((a) => !a.resolvedAt)
  const criticalUnresolved = unresolved.filter((a) => a.severity === "critical")
  const resolved = alerts.filter((a) => Boolean(a.resolvedAt))
  const resolutionRate = alerts.length > 0 ? Math.round((resolved.length / alerts.length) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm font-bold uppercase tracking-widest">Alertas</h1>
          <PageHelp text="Notificações automáticas geradas quando o sistema detecta padrões preocupantes — como funcionários que nunca responderam pesquisas ou índices baixos de bem-estar. Cada alerta pode ser marcado como lido ou resolvido pela equipe de RH." />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{alerts.length} alertas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <div className="grid grid-cols-4 gap-0 border border-border bg-card">
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
            </div>
            <p className="text-3xl font-black text-foreground">{alerts.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">alertas registrados</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Não resolvidos</p>
            </div>
            <p className={`text-3xl font-black ${unresolved.length > 0 ? "text-amber-600" : "text-foreground"}`}>{unresolved.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">aguardando ação</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Críticos</p>
            </div>
            <p className={`text-3xl font-black ${criticalUnresolved.length > 0 ? "text-destructive" : "text-foreground"}`}>{criticalUnresolved.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">sem resolução</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Taxa de resolução</p>
            </div>
            <p className={`text-3xl font-black ${resolutionRateColor(resolutionRate)}`}>{resolutionRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{resolved.length} de {alerts.length} resolvidos</p>
          </div>
        </div>

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
                      <div className="inline-flex items-center gap-0.5">
                        <span className={`${BADGE_BASE} ${TYPE_STYLE[alert.type] ?? BADGE_DEFAULT}`}>
                          {TYPE_LABELS[alert.type] ?? alert.type}
                        </span>
                        <AlertTypeInfo type={alert.type} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${SEVERITY_STYLE[alert.severity] ?? BADGE_DEFAULT}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[alert.severity] ?? "bg-muted-foreground"}`} />
                        {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{alert.message}</td>
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
