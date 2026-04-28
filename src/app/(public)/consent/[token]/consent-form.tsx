"use client"
import { sanitizeRichHtml } from "@/libs/utils/sanitize"

import { useState } from "react"
import { toast } from "sonner"
import { EyeOff } from "lucide-react"
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
      <div className="w-full max-w-lg border border-border bg-card p-8 text-center" style={{ borderRadius: 0 }}>
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
        <p className="text-xs text-muted-foreground mt-0.5">Leia com atenção antes de responder</p>
      </div>
      <div className="p-6 space-y-6">
        <div className="max-h-96 overflow-y-auto border border-border p-4 bg-muted/20">
          <div
            className="text-xs text-foreground leading-relaxed [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_li]:mb-0.5 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
          />
        </div>
        <div className="flex items-start gap-2 p-3 bg-status-success-subtle border border-status-success-border">
          <EyeOff className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
          <p className="text-xs text-status-success leading-relaxed">
            <strong>Suas respostas são 100% anônimas.</strong> Não é possível identificar quem respondeu o quê — nem pelo RH, nem pela gestão, nem por ninguém.
          </p>
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
