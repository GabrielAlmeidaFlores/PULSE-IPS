"use client"

import { useState, useTransition, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { unlockClimateSurveyAction } from "@/app/(public)/climate-survey/link/[linkToken]/actions"
import { ClimateSurveyConsentGate } from "@/app/(public)/climate-survey/[token]/climate-survey-consent-gate"
import { storage } from "@/libs/local-storage"

interface ConsentGateState {
  token: string
  employeeName: string
  consentTermContent: string
}

interface ClimateSurveyUnlockFormProps {
  linkToken: string
}

function subscribeSurveyIdentifier(_callback: () => void): () => void {
  return () => {}
}

function getSurveyIdentifierSnapshot(): string {
  return storage.get(storage.KEYS.surveyIdentifier) ?? ""
}

function getSurveyIdentifierServerSnapshot(): string {
  return ""
}

export function ClimateSurveyUnlockForm({ linkToken }: ClimateSurveyUnlockFormProps): React.ReactElement {
  const router = useRouter()
  const [typedValue, setTypedValue] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [consentGateState, setConsentGateState] = useState<ConsentGateState | null>(null)

  const savedIdentifier = useSyncExternalStore(
    subscribeSurveyIdentifier,
    getSurveyIdentifierSnapshot,
    getSurveyIdentifierServerSnapshot,
  )

  const identifier = typedValue ?? savedIdentifier

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    if (!identifier.trim()) {
      setError("Informe seu telefone ou documento.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await unlockClimateSurveyAction(linkToken, identifier.trim())
      if (result?.error !== undefined) {
        setError(result.error)
        return
      }
      storage.set(storage.KEYS.surveyIdentifier, identifier.trim())
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
        <ClimateSurveyConsentGate
          token={consentGateState.token}
          employeeName={consentGateState.employeeName}
          content={consentGateState.consentTermContent}
          onAccepted={() => { router.push(`/climate-survey/${consentGateState.token}`) }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <div className="px-6 py-6 border-b border-border">
            <div className="flex items-center gap-3 mb-1">
              <ClipboardList className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pesquisa de Clima Organizacional</p>
            </div>
            <h1 className="text-base font-semibold text-foreground mt-2">Identificação</h1>
            <p className="text-xs text-muted-foreground mt-1">
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
                onChange={(e) => { setTypedValue(e.target.value) }}
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
