"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createTermsVersionAction } from "@/app/(super-admin)/super-admin/terms/actions"

export function NewTermsVersionForm(): React.ReactElement {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ version: "", title: "", content: "", effectiveAt: "" })

  function update(field: string, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    const result = await createTermsVersionAction(form)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success("Nova versão dos termos criada. Todos os admins precisarão aceitar novamente.")
      router.refresh()
      setForm({ version: "", title: "", content: "", effectiveAt: "" })
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border bg-card p-6 space-y-4" style={{ borderRadius: 0 }}>
      <h2 className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">Nova versão</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Versão</label>
          <input
            required
            value={form.version}
            onChange={(e) => update("version", e.target.value)}
            placeholder="1.0.0"
            className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2 focus:outline-none focus:border-primary"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Data de vigência</label>
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
        <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Título</label>
        <input
          required
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Termos de Uso — Pulse v1.0"
          className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2 focus:outline-none focus:border-primary"
          style={{ borderRadius: 0 }}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Conteúdo</label>
        <textarea
          required
          rows={10}
          value={form.content}
          onChange={(e) => update("content", e.target.value)}
          placeholder="Texto completo dos termos de uso..."
          className="w-full bg-input border border-border text-foreground text-[13px] px-3 py-2 focus:outline-none focus:border-primary resize-y"
          style={{ borderRadius: 0 }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase px-4 py-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ borderRadius: 0 }}
      >
        {loading ? "Salvando..." : "Publicar nova versão"}
      </button>
    </form>
  )
}
