"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { createConsentTermVersionAction } from "@/app/(super-admin)/super-admin/consent-terms/actions"

export function NewConsentTermForm({ initialContent }: { initialContent?: string }): React.ReactElement {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ version: "", content: initialContent ?? "" })

  function update(field: string, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.content || form.content === "<p></p>") {
      toast.error("O conteúdo do TCLE não pode estar vazio.")
      return
    }
    setLoading(true)
    const result = await createConsentTermVersionAction(form)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success("Nova versão do TCLE publicada. Todos os colaboradores deverão aceitar novamente.")
      router.refresh()
      setForm({ version: "", content: initialContent ?? "" })
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">Nova versão do TCLE</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Ao publicar, todos os colaboradores precisarão aceitar novamente antes de responder pesquisas.
        </p>
      </div>

      <div className="p-6 space-y-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Versão</label>
          <input
            required
            value={form.version}
            onChange={(e) => update("version", e.target.value)}
            placeholder="1.1.0"
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2 focus:outline-none focus:border-primary"
            style={{ borderRadius: 0 }}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Conteúdo</label>
          <RichTextEditor
            key={form.content === (initialContent ?? "") ? "initial" : "editing"}
            value={form.content}
            onChange={(html) => update("content", html)}
            placeholder="Escreva o conteúdo do TCLE aqui. Use H1, H2, H3 para títulos e subtítulos, listas, negrito..."
            minHeight={360}
          />
          <p className="text-[10px] text-muted-foreground">{form.content.length} caracteres</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase px-4 py-2.5 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ borderRadius: 0 }}
        >
          {loading ? "Publicando..." : "Publicar nova versão"}
        </button>
      </div>
    </form>
  )
}
