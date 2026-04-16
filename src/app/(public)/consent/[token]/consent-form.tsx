"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { acceptConsentAction, refuseConsentAction } from "@/app/(public)/consent/[token]/actions"

interface Props {
  token: string
  content: string
}

export function ConsentForm({ token, content }: Props): React.ReactElement {
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<"accepted" | "refused" | null>(null)
  const [loading, setLoading] = useState<"accept" | "refuse" | null>(null)

  async function handleAccept(): Promise<void> {
    setLoading("accept")
    const res = await acceptConsentAction(token)
    if (res.error) {
      toast.error(res.error)
      setLoading(null)
      return
    }
    setResult("accepted")
    setDone(true)
  }

  async function handleRefuse(): Promise<void> {
    setLoading("refuse")
    const res = await refuseConsentAction(token)
    if (res.error) {
      toast.error(res.error)
      setLoading(null)
      return
    }
    setResult("refused")
    setDone(true)
  }

  if (done) {
    return (
      <div className="w-full max-w-lg border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-bold uppercase tracking-wide mb-2">
          {result === "accepted" ? "Consentimento aceito" : "Consentimento recusado"}
        </h2>
        <p className="text-sm text-muted-foreground">Obrigado pela sua resposta.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-sm font-bold uppercase tracking-widest">Termo de Consentimento</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Leia com atencao antes de responder</p>
      </div>
      <div className="p-6 space-y-6">
        <div className="max-h-96 overflow-y-auto border border-border p-4 bg-muted/20">
          <pre className="whitespace-pre-wrap text-sm text-foreground">{content}</pre>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleAccept} disabled={loading !== null} className="flex-1 h-11">
            {loading === "accept" ? "Processando..." : "Aceitar"}
          </Button>
          <Button onClick={handleRefuse} variant="outline" disabled={loading !== null} className="flex-1 h-11">
            {loading === "refuse" ? "Processando..." : "Recusar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
