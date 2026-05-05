"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { unlockHealthSurveyAction } from "@/app/(public)/health-survey/link/[linkToken]/actions"
import { HealthSurveyConsentGate } from "@/app/(public)/health-survey/[token]/health-survey-consent-gate"

interface ConsentGateState {
  token: string
  employeeName: string
  consentTermContent: string
}

interface HealthSurveyUnlockFormProps {
  linkToken: string
}

export function HealthSurveyUnlockForm({ linkToken }: HealthSurveyUnlockFormProps): React.ReactElement {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [consentGateState, setConsentGateState] = useState<ConsentGateState | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    if (!identifier.trim()) {
      setError("Informe seu telefone ou documento.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await unlockHealthSurveyAction(linkToken, identifier.trim())
      if (result?.error !== undefined) {
        setError(result.error)
        return
      }
      if (result?.needsConsent === true && result.consentToken !== undefined && result.employeeName !== undefined) {
        if (result.consentTermContent === null || result.consentTermContent === undefined) {
          setError("Os termos de participação ainda não foram configurados. Tente novamente mais tarde.")
          return
        }
        setConsentGateState({
          token: result.consentToken,
          employeeName: result.employeeName,
          consentTermContent: result.consentTermContent,
        })
      }
    })
  }

  if (consentGateState !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4">
        <HealthSurveyConsentGate
          token={consentGateState.token}
          employeeName={consentGateState.employeeName}
          content={consentGateState.consentTermContent}
          onAccepted={() => { router.push(`/health-survey/${consentGateState.token}`) }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="border border-border bg-card">
          <div className="px-6 py-6 border-b border-border">
            <div className="flex items-center gap-3 mb-1">
              <ClipboardList className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pesquisa de Saúde Ocupacional</p>
            </div>
            <h1 className="text-base font-semibold text-foreground mt-2">Identificação</h1>
            <p className="text-[12px] text-muted-foreground mt-1">
              Para acessar a pesquisa, informe seu telefone ou documento cadastrado.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="identifier" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Telefone ou documento
              </label>
              <Input
                id="identifier"
                type="text"
                placeholder="Ex: (11) 99999-9999"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value) }}
                autoComplete="off"
                disabled={isPending}
              />
              {error !== null && (
                <p className="text-[11px] text-destructive">{error}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Verificando..." : "Acessar pesquisa"}
            </Button>
          </form>

          <div className="px-6 pb-5">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Suas respostas são completamente anônimas. O identificador é usado apenas para garantir que cada colaborador responda uma vez.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
