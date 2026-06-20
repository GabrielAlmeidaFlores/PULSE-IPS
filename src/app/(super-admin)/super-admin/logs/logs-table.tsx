"use client"

import { Fragment, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { RequestLogPage } from "@/modules/request-logs/request-log.types"
import { TablePagination } from "@/libs/design-system"

interface Props {
  data: RequestLogPage
}

const METHOD_COLORS: Record<string, string> = {
  GET: "badge-info",
  POST: "badge-success",
  PUT: "badge-warning",
  PATCH: "badge-warning",
  DELETE: "badge-danger",
}

const BADGE_DEFAULT = "bg-muted text-muted-foreground border border-border"

const USER_TYPE_LABELS: Record<string, string> = {
  org_user: "Org",
  super_admin: "Super Admin",
  anonymous: "Anônimo",
}

const SENSITIVE_HEADERS = new Set(["authorization", "cookie", "set-cookie", "x-api-key"])

function statusColor(status: number | null): string {
  if (status === null) return BADGE_DEFAULT
  if (status < 300) return "badge-success"
  if (status < 400) return "badge-info"
  if (status < 500) return "badge-warning"
  return "badge-danger"
}

function filterSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([k]) => !SENSITIVE_HEADERS.has(k.toLowerCase()))
  )
}

function JsonBlock({ value }: { value: Record<string, unknown> | Record<string, string> }): React.ReactElement {
  const json = JSON.stringify(value, null, 2)
  if (json === "{}") return <span className="text-muted-foreground text-[11px]">vazio</span>
  return (
    <pre className="text-[11px] bg-muted p-2 overflow-x-auto max-h-40 whitespace-pre-wrap break-all" style={{ borderRadius: 0 }}>
      {json}
    </pre>
  )
}

export function LogsTable({ data }: Props): React.ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse table-fixed" style={{ minWidth: 700 }}>
          <colgroup>
            <col style={{ width: "130px" }} />
            <col style={{ width: "70px" }} />
            <col />
            <col style={{ width: "60px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "60px" }} />
          </colgroup>
          <thead>
            <tr className="bg-muted" style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-2 font-bold tracking-widest uppercase text-[10px] text-muted-foreground whitespace-nowrap">Horário</th>
              <th className="text-left px-4 py-2 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Método</th>
              <th className="text-left px-4 py-2 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Caminho</th>
              <th className="text-left px-4 py-2 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 font-bold tracking-widest uppercase text-[10px] text-muted-foreground hidden md:table-cell">IP</th>
              <th className="text-left px-4 py-2 font-bold tracking-widest uppercase text-[10px] text-muted-foreground hidden sm:table-cell">Usuário</th>
              <th className="text-right px-4 py-2 font-bold tracking-widest uppercase text-[10px] text-muted-foreground whitespace-nowrap">ms</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-[11px] tracking-wide">
                  Nenhum log encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
            {data.rows.map((row, i) => {
              const isExpanded = expandedId === row.id
              const hasError = Boolean(row.errorMessage)
              let rowBg = "hover:bg-muted/30"
              if (hasError) {
                rowBg = "bg-status-danger-subtle/40 hover:bg-status-danger-subtle/60"
              } else if (i % 2 !== 0) {
                rowBg = "bg-muted/20 hover:bg-muted/40"
              }
              return (
                <Fragment key={row.id}>
                  <tr
                    className={`cursor-pointer ${rowBg}`}
                    style={{ borderBottom: hasError ? "1px solid var(--status-danger-border)" : "1px solid var(--border)" }}
                    onClick={() => { setExpandedId(isExpanded ? null : row.id) }}
                  >
                    <td className="px-4 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap truncate">
                      {format(new Date(row.createdAt), "dd/MM HH:mm:ss", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold font-mono ${METHOD_COLORS[row.method] ?? BADGE_DEFAULT}`} style={{ borderRadius: 0 }}>
                        {row.method}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 font-mono text-[11px]">
                      <span className="truncate block" title={`${row.path}${row.query !== null ? `?${row.query}` : ""}`}>
                        {row.path}
                        {row.query !== null && <span className="text-muted-foreground">?{row.query}</span>}
                      </span>
                      {row.isRedirect && row.redirectTo !== null && (
                        <span className="text-muted-foreground block text-[10px] truncate">→ {row.redirectTo}</span>
                      )}
                    </td>
                    <td className="px-4 py-1.5">
                      {row.responseStatus !== null ? (
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold font-mono ${statusColor(row.responseStatus)}`} style={{ borderRadius: 0 }}>
                          {row.responseStatus}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap hidden md:table-cell truncate">
                      {row.ip ?? "—"}
                    </td>
                    <td className="px-4 py-1.5 hidden sm:table-cell">
                      {row.userType !== null ? (
                        <div className="flex flex-col">
                          <span className="text-[11px] text-foreground font-medium truncate">
                            {USER_TYPE_LABELS[row.userType] ?? row.userType}
                          </span>
                          {row.userId !== null && (
                            <span className="font-mono text-[10px] text-muted-foreground truncate">{row.userId.slice(0, 8)}…</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Anônimo</span>
                      )}
                    </td>
                    <td className="px-4 py-1.5 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {row.durationMs !== null ? `${row.durationMs}ms` : "—"}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td colSpan={7} className="bg-muted/20 px-4 py-3 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                          <div>
                            <span className="font-semibold text-foreground">ID:</span>{" "}
                            <span className="font-mono text-muted-foreground">{row.id}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Horário:</span>{" "}
                            <span className="font-mono text-muted-foreground">
                              {format(new Date(row.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Duração:</span>{" "}
                            <span className="font-mono text-muted-foreground">{row.durationMs !== null ? `${row.durationMs}ms` : "—"}</span>
                          </div>
                          {row.ip !== null && (
                            <div>
                              <span className="font-semibold text-foreground">IP:</span>{" "}
                              <span className="font-mono text-muted-foreground">{row.ip}</span>
                            </div>
                          )}
                          {row.userId !== null && (
                            <div>
                              <span className="font-semibold text-foreground">User ID:</span>{" "}
                              <span className="font-mono text-muted-foreground">{row.userId}</span>
                            </div>
                          )}
                          {row.tenantId !== null && (
                            <div>
                              <span className="font-semibold text-foreground">Tenant ID:</span>{" "}
                              <span className="font-mono text-muted-foreground">{row.tenantId}</span>
                            </div>
                          )}
                          {row.isRedirect && row.redirectTo !== null && (
                            <div className="col-span-2">
                              <span className="font-semibold text-foreground">Redirecionado para:</span>{" "}
                              <span className="font-mono text-muted-foreground">{row.redirectTo}</span>
                            </div>
                          )}
                          {row.userAgent !== null && (
                            <div className="col-span-2">
                              <span className="font-semibold text-foreground">User Agent:</span>{" "}
                              <span className="text-muted-foreground break-all">{row.userAgent}</span>
                            </div>
                          )}
                        </div>

                        {Object.keys(row.requestHeaders).length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-foreground mb-1">Headers da requisição:</div>
                            <JsonBlock value={filterSensitiveHeaders(row.requestHeaders)} />
                          </div>
                        )}

                        {row.requestBody !== null && Object.keys(row.requestBody).length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-foreground mb-1">Body da requisição:</div>
                            <JsonBlock value={row.requestBody} />
                          </div>
                        )}

                        {row.responseHeaders !== null && Object.keys(row.responseHeaders).length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-foreground mb-1">Headers da resposta:</div>
                            <JsonBlock value={filterSensitiveHeaders(row.responseHeaders)} />
                          </div>
                        )}

                        {row.responseBody !== null && Object.keys(row.responseBody).length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-foreground mb-1">Body da resposta:</div>
                            <JsonBlock value={row.responseBody} />
                          </div>
                        )}

                        {hasError && (
                          <div>
                            <div className="text-xs font-semibold text-status-danger mb-1">Erro: {row.errorMessage}</div>
                            {Boolean(row.errorStack) && (
                              <pre className="text-[11px] bg-status-danger-subtle/50 text-status-danger p-2 overflow-x-auto max-h-52 whitespace-pre-wrap break-all" style={{ borderRadius: 0 }}>
                                {row.errorStack}
                              </pre>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        total={data.total}
      />
    </div>
  )
}
