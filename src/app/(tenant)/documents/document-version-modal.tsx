"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { uploadDocumentVersionAction } from "@/app/(tenant)/documents/actions"

interface Props {
  document: { id: string; title: string }
  open: boolean
  onClose: () => void
}

export function DocumentVersionModal({ document, open, onClose }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fileName, setFileName] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  function handleClose(): void {
    if (isPending) return
    setFileName("")
    formRef.current?.reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const formData = new FormData(form)
    startTransition(async () => {
      const result = await uploadDocumentVersionAction({}, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Nova versão enviada.")
        handleClose()
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest">
            Nova versão
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {document.title}
          </p>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="documentId" value={document.id} />
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Arquivo</Label>
              <label
                className="flex items-center gap-2 w-full bg-input border border-border text-[13px] px-3 py-2.5 cursor-pointer hover:border-primary transition-colors"
                style={{ borderRadius: 0 }}
              >
                <span className="text-muted-foreground truncate flex-1">
                  {fileName || "Selecionar arquivo…"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary shrink-0">
                  Escolher
                </span>
                <input
                  name="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                  disabled={isPending}
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <DialogClose
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
                disabled={isPending}
                type="button"
              >
                Cancelar
              </DialogClose>
              <button
                type="submit"
                disabled={isPending || !fileName}
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? "Enviando..." : "Salvar"}
              </button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
