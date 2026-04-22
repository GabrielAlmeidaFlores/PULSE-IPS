"use client"
import { sanitizeRichHtml } from "@/libs/utils/sanitize"

import { useState } from "react"
import { FileText, CheckCircle, Clock, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface TermsVersion {
  id: string
  version: string
  title: string
  content: string
  isActive: boolean
  effectiveAt: Date
  createdAt: Date
}

interface Props {
  versions: TermsVersion[]
}

export function TermsVersionList({ versions }: Props): React.ReactElement {
  const [preview, setPreview] = useState<TermsVersion | null>(null)

  if (versions.length === 0) {
    return <p className="text-[13px] text-muted-foreground">Nenhuma versão criada ainda.</p>
  }

  return (
    <>
      <div className="space-y-3">
        {versions.map((v) => (
          <div key={v.id} className="border border-border bg-card" style={{ borderRadius: 0 }}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{v.title}</p>
                    <p className="text-[11px] text-muted-foreground">Versão {v.version}</p>
                  </div>
                </div>
                {v.isActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 shrink-0">
                    <CheckCircle className="h-3 w-3" /> Ativa
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground bg-muted border border-border px-2 py-0.5 shrink-0">
                    <Clock className="h-3 w-3" /> Inativa
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-[11px] text-muted-foreground">
                  Vigência: {new Date(v.effectiveAt).toLocaleDateString("pt-BR")} · Publicado em{" "}
                  {new Date(v.createdAt).toLocaleDateString("pt-BR")}
                </p>
                <button
                  type="button"
                  onClick={() => setPreview(v)}
                  className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/80 transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  <Eye className="h-3 w-3" /> Ver conteúdo
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" style={{ borderRadius: 0 }}>
          <DialogHeader className="shrink-0 border-b border-border pb-3">
            <DialogTitle className="text-[13px] font-black tracking-[0.15em] uppercase">
              {preview?.title}
            </DialogTitle>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px] text-muted-foreground">Versão {preview?.version}</span>
              {preview?.isActive && (
                <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-green-600 bg-green-50 border border-green-200 px-2 py-0.5">
                  <CheckCircle className="h-3 w-3" /> Ativa
                </span>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {preview && (
              <div
                className="text-[13px] text-foreground leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_li]:mb-1 [&_strong]:font-semibold [&_hr]:border-border [&_hr]:my-4"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(preview.content) }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
