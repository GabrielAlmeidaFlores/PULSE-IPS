"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { createPrivacyPolicyVersionAction } from "@/app/(super-admin)/super-admin/terms/privacy-policy-actions"

export function NewPrivacyPolicyVersionForm({
  initialContent,
}: {
  initialContent?: string
}): React.ReactElement {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    version: "",
    title: "",
    content: initialContent ?? "",
    effectiveAt: "",
  })

  function update(field: string, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.content || form.content === "<p></p>") {
      toast.error("O conteúdo da política de privacidade não pode estar vazio.")
      return
    }
    setLoading(true)
    const result = await createPrivacyPolicyVersionAction(form)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success("Nova versão da política de privacidade publicada.")
      router.refresh()
      setForm({ version: "", title: "", content: initialContent ?? "", effectiveAt: "" })
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
          Nova versão
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Ao publicar, a versão anterior fica inativa. A nova versão fica disponível na página pública.
        </p>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              Versão
            </label>
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
            <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              Data de vigência
            </label>
            <input
              required
              type="date"
              value={form.effectiveAt}
              onChange={(e) => update("effectiveAt", e.target.value)}
              className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2 focus:outline-none focus:border-primary"
              style={{ borderRadius: 0 }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Título
          </label>
          <input
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Política de Privacidade — Pulse v1.1"
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2 focus:outline-none focus:border-primary"
            style={{ borderRadius: 0 }}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            Conteúdo
          </label>
          <RichTextEditor
            key={form.content === (initialContent ?? "") ? "initial" : "editing"}
            value={form.content}
            onChange={(html) => update("content", html)}
            placeholder="Escreva o conteúdo da política de privacidade aqui..."
            minHeight={340}
            maxHeight={500}
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
