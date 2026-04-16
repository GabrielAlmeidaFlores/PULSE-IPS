"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
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
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState<DocType>("policy")
  const [fileUrl, setFileUrl] = useState("")

  function handleSubmit(): void {
    startTransition(async () => {
      const result = await createDocumentAction({ title, type, fileUrl })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Documento adicionado.")
        setOpen(false)
        setTitle("")
        setType("policy")
        setFileUrl("")
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        style={{ borderRadius: 0 }}
      >
        Adicionar
      </button>
    )
  }

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Título</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Política de Saúde"
          className="bg-input border border-border text-foreground text-[12px] px-3 py-2 w-52 focus:outline-none focus:border-primary"
          style={{ borderRadius: 0 }}
          disabled={isPending}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo</p>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DocType)}
          className="bg-input border border-border text-foreground text-[12px] px-3 py-2 focus:outline-none focus:border-primary"
          style={{ borderRadius: 0 }}
          disabled={isPending}
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">URL do Arquivo</p>
        <input
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://..."
          className="bg-input border border-border text-foreground text-[12px] px-3 py-2 w-64 focus:outline-none focus:border-primary"
          style={{ borderRadius: 0 }}
          disabled={isPending}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={isPending || !title.trim() || !fileUrl.trim()}
        className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderRadius: 0 }}
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
      <button
        onClick={() => setOpen(false)}
        disabled={isPending}
        className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
        style={{ borderRadius: 0 }}
      >
        Cancelar
      </button>
    </div>
  )
}
