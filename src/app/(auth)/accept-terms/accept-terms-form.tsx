"use client"

import { useState } from "react"
import { toast } from "sonner"
import { acceptTermsAction } from "@/app/(auth)/accept-terms/actions"

interface Props {
  termsVersionId: string
  title: string
  version: string
  content: string
}

export function AcceptTermsForm({ termsVersionId, title, version, content }: Props): React.ReactElement {
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  async function handleAccept(): Promise<void> {
    if (!checked) return
    setLoading(true)
    try {
      const result = await acceptTermsAction(termsVersionId)
      if (result?.error) toast.error(result.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-border bg-card w-full max-w-2xl mx-auto" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-6 py-4 border-l-4 border-l-primary">
        <div className="flex flex-col leading-none mb-1">
          <span className="text-[18px] font-black tracking-[0.2em] uppercase text-foreground">PULSE</span>
          <span className="text-[9px] font-semibold tracking-[0.3em] uppercase text-primary">TERMOS DE USO</span>
        </div>
        <p className="text-[13px] font-bold text-foreground mt-2">{title}</p>
        <p className="text-[11px] text-muted-foreground">Versão {version}</p>
      </div>

      <div className="px-6 py-4 max-h-[50vh] overflow-y-auto border-b border-border">
        <div className="text-[13px] text-foreground leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      <div className="px-6 py-4 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
          />
          <span className="text-[12px] text-foreground">
            Li e concordo com os Termos de Uso da plataforma Pulse na versão <strong>{version}</strong>.
          </span>
        </label>

        <button
          onClick={handleAccept}
          disabled={!checked || loading}
          className="w-full bg-primary text-primary-foreground text-[11px] font-black tracking-widest uppercase px-4 py-3 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ borderRadius: 0 }}
        >
          {loading ? "Registrando aceite..." : "Aceitar e continuar"}
        </button>
      </div>
    </div>
  )
}
