"use client"

import { Fragment, useState } from "react"
import type { JobLogRow } from "@/modules/job-logs/job-log.types"
import { TablePagination } from "@/libs/design-system"
import { Badge } from "@/components/ui/badge"
import { extractJobPayloadTenantId } from "@/app/(super-admin)/super-admin/jobs/job-payload-utils"

interface Props {
  rows: JobLogRow[]
  total: number
  orgMap: Record<string, { name: string; slug: string }>
}

const STATUS_COLORS: Record<string, string> = {
  completed: "badge-success",
  failed:    "badge-danger",
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluído",
  failed:    "Falhou",
}

const QUEUE_LABELS: Record<string, string> = {
  "pulse-jobs":     "Jobs",
  "pulse-messages": "Mensagens",
}

const JOB_NAME_LABELS: Record<string, string> = {
  "health-survey-dispatcher":               "Disparo de Pesquisas",
  "health-survey-adherence-checker":        "Verificador de Adesão",
  "health-survey-score-alert-detector":     "Detector de Alertas de Score",
  "employee-unpause":                "Reativação de Colaboradores",
  "pgr-review-reminder":             "Lembrete de Revisão PGR",
  "stripe-webhook-retry":            "Reprocessamento de Webhooks",
  "health-survey-response-token-cleanup":   "Limpeza de Tokens de Resposta",
  "action-plan-suggestion-generator": "Gerador de Sugestões de Plano",
  "organization-deletion-executor":  "Exclusão de Organizações",
  "send-message":                    "Envio de Mensagem",
}

function formatDate(date: Date | null): string {
  if (date === null) return "—"
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—"
  if (ms < 1_000) return `${ms}ms`
  return `${(ms / 1_000).toFixed(1)}s`
}

export function JobLogsTable({ rows, total, orgMap }: Props): React.ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm border-collapse table-fixed">
          <colgroup>
            <col className="w-36" />
            <col className="w-44" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-20" />
            <col className="w-20" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2">Fila</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Tentativa</th>
              <th className="px-3 py-2">Duração</th>
              <th className="px-3 py-2">Erro</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  className={`cursor-pointer text-xs hover:bg-muted/30 ${Boolean(row.errorMessage) ? "bg-status-danger-subtle/50" : ""}`}
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onClick={() => { setExpandedId(expandedId === row.id ? null : row.id) }}
                >
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground truncate">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-3 py-2 font-medium truncate">{JOB_NAME_LABELS[row.jobName] ?? row.jobName}</td>
                  <td className="px-3 py-2 text-muted-foreground truncate">{QUEUE_LABELS[row.queueName] ?? row.queueName}</td>
                  <td className="px-3 py-2">
                    <Badge className={`${STATUS_COLORS[row.status] ?? "bg-muted text-muted-foreground border-border"} border text-[10px] font-semibold`}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.attemptNumber}/{row.maxAttempts}
                  </td>
                  <td className="px-3 py-2 font-mono truncate">{formatDuration(row.durationMs)}</td>
                  <td className="px-3 py-2 text-status-danger truncate" title={row.errorMessage ?? undefined}>
                    {row.errorMessage ?? "—"}
                  </td>
                </tr>
                {expandedId === row.id && (
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <td colSpan={7} className="bg-muted/20 px-4 py-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-semibold text-foreground">Job ID:</span>{" "}
                          <span className="font-mono">{row.jobId}</span>
                        </div>
                        {(() => {
                          const tenantId = extractJobPayloadTenantId(row.payload)
                          const org = tenantId !== null ? orgMap[tenantId] : undefined
                          if (org === undefined) return null
                          return (
                            <div>
                              <span className="font-semibold text-foreground">Organização:</span>{" "}
                              <span className="font-medium">{org.name}</span>
                              {" "}
                              <span className="font-mono text-[10px] bg-muted px-1 py-0.5">{org.slug}</span>
                            </div>
                          )
                        })()}
                        <div>
                          <span className="font-semibold text-foreground">Iniciado em:</span>{" "}
                          {formatDate(row.startedAt)}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Concluído em:</span>{" "}
                          {formatDate(row.finishedAt)}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Enfileirado em:</span>{" "}
                          {formatDate(row.queuedAt)}
                        </div>
                      </div>
                      {row.payload !== null && row.payload !== undefined && JSON.stringify(row.payload) !== "{}" && (
                        <div>
                          <div className="text-xs font-semibold text-foreground mb-1">Payload:</div>
                          <pre className="text-[11px] bg-muted p-2 rounded overflow-x-auto max-h-40">
                            {JSON.stringify(row.payload, null, 2)}
                          </pre>
                        </div>
                      )}
                      {row.result !== null && row.result !== undefined && JSON.stringify(row.result) !== "{}" && (
                        <div>
                          <div className="text-xs font-semibold text-foreground mb-1">Resultado:</div>
                          <pre className="text-[11px] bg-muted p-2 rounded overflow-x-auto max-h-40">
                            {JSON.stringify(row.result, null, 2)}
                          </pre>
                        </div>
                      )}
                      {Boolean(row.errorStack) && (
                        <div>
                          <div className="text-xs font-semibold text-status-danger mb-1">Stack trace:</div>
                          <pre className="text-[11px] bg-status-danger-subtle/50 text-status-danger p-2 rounded overflow-x-auto max-h-52 whitespace-pre-wrap">
                            {row.errorStack}
                          </pre>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        total={total}
        pageSizeOptions={[10, 20, 30, 50]}
      />
    </div>
  )
}
