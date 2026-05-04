import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getAlertsPaginated, getAlertStats, type AlertListingQuery } from "@/modules/alerts/alert.service"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { format } from "date-fns"
import { AlertRowActions } from "@/app/(tenant)/alerts/alert-row-actions"
import { PageHelp } from "@/components/page-help"
import { AlertTypeInfo } from "@/components/alert-type-info"
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react"
import { DataTable, TablePagination } from "@/libs/design-system"
import {
  BADGE_DEFAULT,
  BADGE_BASE,
  BADGE_GREEN,
  BADGE_AMBER,
  SEVERITY_LABELS,
  SEVERITY_STYLE,
  SEVERITY_DOT,
  TYPE_LABELS,
  TYPE_STYLE,
} from "@/libs/design-system/alert-labels"

import { AlertListFilters } from "@/app/(tenant)/alerts/alert-list-filters"

const WS_NOWRAP = "whitespace-nowrap"

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

function resolutionRateColor(rate: number): string {
  if (rate >= 80) return "text-status-success"
  if (rate >= 50) return "text-status-warning"
  return "text-foreground"
}

export default async function AlertsPage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const typeFilter = params["type"]
  const severityFilter = params["severity"]
  const statusFilter = params["status"]
  const pageParams = buildPaginationParams(params["page"], params["pageSize"])

  const alertQuery: AlertListingQuery = { page: pageParams.page, pageSize: pageParams.pageSize }
  if (typeFilter !== undefined) alertQuery.type = typeFilter
  if (severityFilter !== undefined) alertQuery.severity = severityFilter
  if (statusFilter !== undefined) alertQuery.status = statusFilter

  const [{ alerts, total }, stats, hasMessaging] = await Promise.all([
    getAlertsPaginated(session.tenantId, alertQuery),
    getAlertStats(session.tenantId),
    hasTenantPlanFeature(session.tenantId, "messaging"),
  ])

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm font-bold uppercase tracking-widest">Alertas</h1>
          <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">O que são alertas?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Notificações geradas automaticamente pelo sistema quando detecta padrões que requerem atenção do RH. Nenhuma configuração manual é necessária — o Pulse monitora continuamente os dados e cria alertas proativamente.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Tipos de alerta</p>
                  <ul className="text-[12px] text-foreground leading-relaxed space-y-1 list-none">
                    <li>📉 <strong>Queda de score</strong> — índice caiu mais de 1 ponto em relação ao período anterior</li>
                    <li>📊 <strong>Tendência negativa</strong> — 3 períodos consecutivos abaixo da média histórica</li>
                    <li>👻 <strong>Baixa adesão</strong> — menos de 80% de respostas após 48h do disparo</li>
                    <li>🚨 <strong>Relato de crise</strong> — relato anônimo com palavras-chave de saúde mental grave</li>
                    <li>📋 <strong>Revisão PGR</strong> — 30 dias antes do vencimento da próxima revisão</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Severidade</p>
                  <p className="text-[12px] text-foreground leading-relaxed"><strong className="text-status-danger">Crítico</strong> — ação imediata recomendada. <strong className="text-status-warning">Atenção</strong> — monitorar de perto. <strong className="text-status-info">Informativo</strong> — ciência apenas. Alertas críticos envolvendo bem-estar mental devem gerar um Plano de Ação documentado.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Como agir</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Para cada alerta relevante, crie um <strong>Plano de Ação</strong> (menu lateral) descrevendo as medidas adotadas. Isso documenta a resposta da empresa e é uma evidência importante para o histórico de saúde ocupacional.</p>
                </div>
              </div>
            } />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{stats.total} alertas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        <div className="grid grid-cols-4 gap-0 border border-border bg-card">
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
            </div>
            <p className="text-3xl font-black text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">alertas registrados</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Não resolvidos</p>
            </div>
            <p className={`text-3xl font-black ${stats.unresolved > 0 ? "text-status-warning" : "text-foreground"}`}>{stats.unresolved}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">aguardando ação</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Críticos</p>
            </div>
            <p className={`text-3xl font-black ${stats.criticalUnresolved > 0 ? "text-destructive" : "text-foreground"}`}>{stats.criticalUnresolved}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">sem resolução</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Taxa de resolução</p>
            </div>
            <p className={`text-3xl font-black ${resolutionRateColor(resolutionRate)}`}>{resolutionRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.resolved} de {stats.total} resolvidos</p>
          </div>
        </div>

        <AlertListFilters filters={{ ...(typeFilter !== undefined && { type: typeFilter }), ...(severityFilter !== undefined && { severity: severityFilter }), ...(statusFilter !== undefined && { status: statusFilter }) }} />

        <DataTable
          columns={[
            { label: "Tipo", className: WS_NOWRAP },
            { label: "Severidade", className: WS_NOWRAP },
            { label: "Setor", className: WS_NOWRAP },
            { label: "Mensagem" },
            { label: "Data", className: WS_NOWRAP },
            { label: "Status", className: WS_NOWRAP },
            { label: "Ações", align: "right", className: `w-40 ${WS_NOWRAP}` },
          ]}
          total={total}
          emptyMessage="Nenhum alerta."
          pagination={<TablePagination total={total} />}
        >
          {alerts.map((alert) => {
            let statusCls: string
            let statusLabel: string
            if (alert.resolvedAt) {
              statusCls = BADGE_GREEN
              statusLabel = "Resolvido"
            } else if (alert.isRead) {
              statusCls = BADGE_DEFAULT
              statusLabel = "Lido"
            } else {
              statusCls = BADGE_AMBER
              statusLabel = "Novo"
            }
            return (
              <tr key={alert.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="inline-flex items-center gap-0.5">
                    <span className={`${BADGE_BASE} ${TYPE_STYLE[alert.type] ?? BADGE_DEFAULT}`}>
                      {TYPE_LABELS[alert.type] ?? alert.type}
                    </span>
                    <AlertTypeInfo type={alert.type} hasMessaging={hasMessaging} />
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${SEVERITY_STYLE[alert.severity] ?? BADGE_DEFAULT}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[alert.severity] ?? "bg-muted-foreground"}`} />
                    {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                  {alert.department?.name ?? <span className="text-muted-foreground/50">—</span>}
                </td>
                <td className="px-4 py-3 text-xs">{alert.message}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{format(new Date(alert.createdAt), "dd/MM HH:mm")}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`${BADGE_BASE} ${statusCls}`}>
                    {statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-right w-40 whitespace-nowrap">
                  <AlertRowActions alertId={alert.id} isRead={alert.isRead} isResolved={Boolean(alert.resolvedAt)} />
                </td>
              </tr>
            )
          })}
        </DataTable>

      </div>
    </div>
  )
}
