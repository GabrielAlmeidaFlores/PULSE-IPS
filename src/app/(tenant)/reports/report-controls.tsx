"use client"

import React, { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { updateReportStatusAction } from "@/app/(tenant)/reports/actions"
import type { AnonymousReport } from "@prisma/client"

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  analyzing: "Em análise",
  resolved: "Resolvido",
  archived: "Arquivado",
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-destructive/10 text-destructive border-destructive/20",
  analyzing: "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-muted text-muted-foreground border-border",
  archived: "bg-muted/50 text-muted-foreground/60 border-border",
}

interface Props {
  reports: AnonymousReport[]
}

export function ReportControls({ reports }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function handleStatusChange(reportId: string, status: "open" | "analyzing" | "resolved" | "archived"): void {
    startTransition(async () => {
      const result = await updateReportStatusAction(reportId, { status })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Status atualizado.")
      router.refresh()
    })
  }

  if (reports.length === 0) {
    return (
      <div className="border border-border bg-card px-6 py-12 text-center">
        <p className="text-xs text-muted-foreground">Nenhum relato recebido.</p>
      </div>
    )
  }

  return (
    <div className="border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoria</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Relato</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acao</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, i) => (
            <React.Fragment key={report.id}>
              <tr
                key={report.id}
                className={`border-b border-border ${expandedId === report.id ? "" : "last:border-0"} ${i % 2 !== 0 ? "bg-muted/10" : ""} cursor-pointer hover:bg-muted/30 transition-colors`}
                onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
              >
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {new Intl.DateTimeFormat("pt-BR").format(new Date(report.createdAt))}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[10rem] truncate" title={report.category ?? ""}>
                  {report.category ? report.category.slice(0, 20) : "—"}
                </td>
                <td className="px-4 py-3 text-xs max-w-xs truncate">{report.content}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[report.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {STATUS_LABELS[report.status] ?? report.status}
                  </span>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    {report.status !== "analyzing" && report.status !== "resolved" && (
                      <button
                        onClick={() => handleStatusChange(report.id, "analyzing")}
                        disabled={isPending}
                        style={{ borderRadius: 0 }}
                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 disabled:opacity-40"
                      >
                        Analisar
                      </button>
                    )}
                    {report.status !== "resolved" && (
                      <button
                        onClick={() => handleStatusChange(report.id, "resolved")}
                        disabled={isPending}
                        style={{ borderRadius: 0 }}
                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-muted-foreground/40 text-muted-foreground hover:bg-muted disabled:opacity-40"
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              {expandedId === report.id && (
                <tr key={`${report.id}-expanded`} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td colSpan={5} className="px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Conteúdo completo</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.content}</p>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
