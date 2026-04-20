"use client"

import { useState, useEffect, useTransition } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Download, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { getDocumentVersionsAction } from "@/app/(tenant)/documents/actions"
import type { DocumentVersionItem } from "@/modules/documents/document.types"

interface Props {
  document: { id: string; title: string }
  open: boolean
  onClose: () => void
}

export function DocumentVersionsHistoryModal({ document, open, onClose }: Props): React.ReactElement {
  const [versions, setVersions] = useState<DocumentVersionItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    startTransition(async () => {
      setVersions([])
      setLoadError(null)
      const result = await getDocumentVersionsAction(document.id)
      if (result.error) {
        setLoadError(result.error)
      } else {
        setVersions(result.versions ?? [])
      }
    })
  }, [open, document.id])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="sm:max-w-2xl w-full" style={{ borderRadius: 0 }}>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest">
            Histórico de versões
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 mb-4 truncate">
            {document.title}
          </p>

          {isPending && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 size={18} className="animate-spin mr-2" />
              <span className="text-xs">Carregando...</span>
            </div>
          )}

          {!isPending && loadError && (
            <p className="text-xs text-destructive py-4 text-center">{loadError}</p>
          )}

          {!isPending && !loadError && versions.length === 0 && (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Nenhuma versão registrada.
            </p>
          )}

          {!isPending && !loadError && versions.length > 0 && (
            <div className="border border-border overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Versão
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Enviado por
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Data
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v, i) => (
                    <tr
                      key={v.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-primary/40 text-primary bg-primary/5">
                          v{v.version}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {v.uploadedBy}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(v.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/api/documents/${document.id}/versions/${v.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                        >
                          <Download size={12} />
                          Baixar
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
