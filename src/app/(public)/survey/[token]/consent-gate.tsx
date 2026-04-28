"use client"
import { sanitizeRichHtml } from "@/libs/utils/sanitize"

import { useState } from "react"
import { toast } from "sonner"
import { EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { acceptConsentAction, refuseConsentAction } from "@/app/(public)/survey/[token]/actions"

interface Props {
  token: string
  employeeName: string
  content: string
  onAccepted: () => void
}

export function ConsentGate({ token, employeeName, content, onAccepted }: Props): React.ReactElement {
  const [loading, setLoading] = useState<"accept" | "refuse" | null>(null)
  const [refused, setRefused] = useState(false)

  const firstName = employeeName.split(" ")[0] ?? employeeName

  async function handleAccept(): Promise<void> {
    setLoading("accept")
    const result = await acceptConsentAction(token)
    if (result.error) {
      toast.error(result.error)
      setLoading(null)
      return
    }
    onAccepted()
  }

  async function handleRefuse(): Promise<void> {
    setLoading("refuse")
    const result = await refuseConsentAction(token)
    if (result.error) {
      toast.error(result.error)
      setLoading(null)
      return
    }
    setRefused(true)
  }

  if (refused) {
    return (
      <div className="w-full max-w-lg border border-border bg-card p-8 text-center" style={{ borderRadius: 0 }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Participação recusada</p>
        <p className="text-sm text-foreground">Tudo bem, {firstName}. Sua escolha foi registrada e você não receberá mais pesquisas.</p>
        <p className="text-xs text-muted-foreground mt-2">Caso mude de ideia, entre em contato com o RH.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Antes de continuar</p>
        <h1 className="text-base font-bold">Olá, {firstName}! 👋</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Para responder à pesquisa de bem-estar, precisamos do seu consentimento. Leia o termo abaixo e nos diga se você aceita participar.
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div className="max-h-72 overflow-y-auto border border-border p-4 bg-muted/20">
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

        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Ao aceitar, você concorda em participar das pesquisas periódicas de forma anônima. Você pode revogar sua participação a qualquer momento.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              disabled={loading !== null}
              className="flex-1 h-11"
            >
              {loading === "accept" ? "Processando..." : "Aceitar e responder pesquisa"}
            </Button>
            <Button
              onClick={handleRefuse}
              variant="outline"
              disabled={loading !== null}
              className="flex-1 h-11"
            >
              {loading === "refuse" ? "Processando..." : "Não quero participar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
