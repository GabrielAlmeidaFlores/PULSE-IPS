"use client"

import { useState } from "react"
import { ClimateSurveyConsentGate } from "@/app/(public)/climate-survey/[token]/climate-survey-consent-gate"
import { ClimateSurveyForm } from "@/app/(public)/climate-survey/[token]/climate-survey-form"

interface Question {
  id: string
  text: string
  order: number
  scoreDirection: "higher_is_better" | "lower_is_better"
  dimension: string
  dimensionLabel: string
}

interface Props {
  token: string
  employeeName: string
  consentStatus: "accepted" | "needs_consent"
  consentTermContent: string | null
  questions: Question[]
}

export function ClimateSurveyPageClient({
  token,
  employeeName,
  consentStatus,
  consentTermContent,
  questions,
}: Props): React.ReactElement {
  const [showSurvey, setShowSurvey] = useState(consentStatus === "accepted")

  if (!showSurvey) {
    if (consentTermContent === null) {
      return (
        <div className="w-full max-w-sm border border-border bg-card p-6 text-center" style={{ borderRadius: 0 }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Pesquisa indisponível
          </p>
          <p className="text-sm text-muted-foreground">
            Os termos de participação ainda não foram configurados. Tente novamente mais tarde.
          </p>
        </div>
      )
    }
    return (
      <ClimateSurveyConsentGate
        token={token}
        employeeName={employeeName}
        content={consentTermContent}
        onAccepted={() => setShowSurvey(true)}
      />
    )
  }

  return <ClimateSurveyForm token={token} employeeName={employeeName} questions={questions} />
}
