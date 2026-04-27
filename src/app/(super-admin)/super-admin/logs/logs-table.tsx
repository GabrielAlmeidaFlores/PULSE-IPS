"use client"

import { Fragment } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { RequestLogPage } from "@/modules/request-logs/request-log.types"
import { TablePagination } from "@/libs/design-system"

interface Props {
  data: RequestLogPage
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  POST: "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  PUT: "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  PATCH: "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  DELETE: "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

const BADGE_DEFAULT = "bg-muted text-muted-foreground border border-border"

const USER_TYPE_LABELS: Record<string, string> = {
  org_user: "Org",
  super_admin: "Super Admin",
  anonymous: "Anônimo",
}

function statusColor(status: number | null): string {
  if (status === null) return BADGE_DEFAULT
  if (status < 300) return "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
  if (status < 400) return "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
  if (status < 500) return "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
  return "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
}

export function LogsTable({ data }: Props): React.ReactElement {
  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <table className="w-full text-[12px] border-collapse">
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
          {data.rows.map((row, i) => (
            <Fragment key={row.id}>
              <tr
                className={`${Boolean(row.errorMessage) ? "bg-red-50/40" : ""} ${i % 2 !== 0 && !Boolean(row.errorMessage) ? "bg-muted/20" : ""}`}
                style={{ borderBottom: Boolean(row.errorMessage) ? "1px solid rgb(254 202 202)" : "1px solid var(--border)" }}
              >
                <td className="px-4 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {format(new Date(row.createdAt), "dd/MM HH:mm:ss", { locale: ptBR })}
                </td>
                <td className="px-4 py-1.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold font-mono ${METHOD_COLORS[row.method] ?? BADGE_DEFAULT}`} style={{ borderRadius: 0 }}>
                    {row.method}
                  </span>
                </td>
                <td className="px-4 py-1.5 font-mono text-[11px] max-w-[300px]">
                  <span className="truncate block" title={`${row.path}${row.query !== null ? `?${row.query}` : ""}`}>
                    {row.path}
                    {row.query !== null && <span className="text-muted-foreground">?{row.query}</span>}
                  </span>
                  {row.isRedirect && row.redirectTo !== null && (
                    <span className="text-muted-foreground block text-[10px]">→ {row.redirectTo}</span>
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
                <td className="px-4 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap hidden md:table-cell">
                  {row.ip ?? "—"}
                </td>
                <td className="px-4 py-1.5 hidden sm:table-cell">
                  {row.userType !== null ? (
                    <div className="flex flex-col">
                      <span className="text-[11px] text-foreground font-medium">
                        {USER_TYPE_LABELS[row.userType] ?? row.userType}
                      </span>
                      {row.userId !== null && (
                        <span className="font-mono text-[10px] text-muted-foreground">{row.userId.slice(0, 8)}…</span>
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
              {Boolean(row.errorMessage) && (
                <tr className="bg-red-50/60" style={{ borderBottom: "1px solid rgb(254 202 202)" }}>
                  <td colSpan={7} className="px-4 py-2">
                    <div className="font-mono text-[11px] text-red-800 font-semibold mb-1">{row.errorMessage}</div>
                    {Boolean(row.errorStack) && (
                      <pre className="font-mono text-[10px] text-red-700/70 whitespace-pre-wrap break-all leading-relaxed max-h-32 overflow-y-auto">{row.errorStack}</pre>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <TablePagination
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        pageSize={data.pageSize}
      />
    </div>
  )
}
