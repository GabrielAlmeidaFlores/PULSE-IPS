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
import { NativeSelect } from "@/components/ui/native-select"
import { createDocumentAction } from "@/app/(tenant)/documents/actions"

const DOC_TYPES = [
  { value: "policy", label: "Política" },
  { value: "procedure", label: "Procedimento" },
  { value: "pgr", label: "PGR" },
  { value: "pcmso", label: "PCMSO" },
  { value: "other", label: "Outro" },
] as const

type DocType = (typeof DOC_TYPES)[number]["value"]

export function AddDocumentForm(): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState<DocType>("policy")
  const [fileName, setFileName] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  function handleClose(): void {
    if (isPending) return
    setOpen(false)
    setTitle("")
    setType("policy")
    setFileName("")
    formRef.current?.reset()
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const formData = new FormData(form)
    startTransition(async () => {
      const result = await createDocumentAction({}, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Documento adicionado.")
        handleClose()
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors border border-primary"
        style={{ borderRadius: 0 }}
      >
        Adicionar
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">
              Adicionar documento
            </DialogTitle>
            <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Título</Label>
                <input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Política de Saúde"
                  className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  style={{ borderRadius: 0 }}
                  disabled={isPending}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Tipo</Label>
                <NativeSelect
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as DocType)}
                  disabled={isPending}
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
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
                  disabled={isPending || !title.trim() || !fileName}
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
    </>
  )
}
