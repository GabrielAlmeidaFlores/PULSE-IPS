"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { OrgAuditEntry } from "@/modules/organizations/organization.types"
import { TablePagination } from "@/libs/design-system/components/data-display/TablePagination"

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.login": "Login de usuário",
  "user.logout": "Logout de usuário",
  "user.invited": "Usuário convidado",
  "user.invite_resent": "Convite reenviado",
  "user.invite_cancelled": "Convite cancelado",
  "user.invite_accepted": "Convite aceito",
  "user.created": "Usuário criado",
  "user.updated": "Usuário atualizado",
  "user.deleted": "Usuário excluído",
  "user.password_changed": "Senha alterada",
  "user.password_reset": "Senha redefinida",
  "user.password_reset_requested": "Solicitação de reset de senha",
  "user.password_reset_completed": "Senha redefinida",
  "employee.created": "Colaborador criado",
  "employee.updated": "Colaborador atualizado",
  "employee.deactivated": "Colaborador desativado",
  "employee.deleted": "Colaborador excluído",
  "employee.imported": "Colaboradores importados",
  "department.created": "Setor criado",
  "department.updated": "Setor atualizado",
  "department.deleted": "Setor excluído",
  "health_survey.configured": "Pesquisa configurada",
  "health_survey.dispatched": "Pesquisa disparada",
  "document.uploaded": "Documento enviado",
  "document.created": "Documento criado",
  "document.updated": "Documento atualizado",
  "document.deleted": "Documento excluído",
  "document.edited": "Documento editado",
  "report.submitted": "Relato enviado",
  "report.exported": "Relatório exportado",
  "action_plan.created": "Plano de ação criado",
  "action_plan.updated": "Plano de ação atualizado",
  "anonymous_report.status_updated": "Status do relato atualizado",
  "billing.checkout_started": "Checkout iniciado",
  "billing.subscription_updated": "Assinatura atualizada",
}

const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  employees: "Colaboradores",
  organization_users: "Usuários",
  organization_invitations: "Convites",
  departments: "Setores",
  documents: "Documentos",
  anonymous_reports: "Relatos Anônimos",
  action_plans: "Planos de Ação",
  health_survey_configurations: "Configurações de Pesquisa",
  health_survey_dispatches: "Pesquisas",
  pgr_reviews: "Revisões PGR",
  billing: "Cobrança",
}

interface OrgAuditLogsProps {
  items: OrgAuditEntry[]
  total: number
  timezone: string
}

export function OrgAuditLogs({ items, total, timezone }: OrgAuditLogsProps): React.ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-[12px] text-muted-foreground">
          Nenhuma atividade registrada.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((log) => {
            const actionLabel = AUDIT_ACTION_LABELS[log.action] ?? log.action
            const resourceLabel = AUDIT_RESOURCE_LABELS[log.resource] ?? log.resource
            const createdAt = new Date(log.createdAt)
            const orgTimestamp = createdAt.toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: timezone,
            })
            const utcTimestamp = createdAt.toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "UTC",
            })
            const isExpanded = expandedId === log.id
            const hasMetadata = log.metadata !== null && Object.keys(log.metadata).length > 0

            return (
              <div key={log.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full px-5 py-3 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground truncate">
                      {actionLabel}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {resourceLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] text-foreground">{orgTimestamp}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        UTC: {utcTimestamp}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 bg-muted/20 border-t border-border">
                    <div className="pt-3 grid grid-cols-1 gap-2">
                      <DetailRow label="ID do registro" value={log.id} mono />
                      {log.userId !== null && (
                        <DetailRow
                          label="Usuário"
                          value={log.userName !== null ? `${log.userName} (${log.userId})` : log.userId}
                          mono={log.userName === null}
                        />
                      )}
                      {log.resourceId !== null && (
                        <DetailRow label="ID do recurso" value={log.resourceId} mono />
                      )}
                      {hasMetadata && log.metadata !== null &&
                        Object.entries(log.metadata).map(([key, val]) => (
                          <DetailRow
                            key={key}
                            label={key}
                            value={val !== null ? String(val) : "—"}
                          />
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <TablePagination total={total} />
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string
  mono?: boolean
}

function DetailRow({ label, value, mono = false }: DetailRowProps): React.ReactElement {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-[11px] text-muted-foreground w-28 shrink-0 pt-px">{label}</span>
      <span className={`text-[11px] text-foreground break-all ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  )
}
