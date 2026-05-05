"use client"

import { useState } from "react"
import { HealthSurveyConsentGate } from "@/app/(public)/health-survey/[token]/health-survey-consent-gate"
import { HealthSurveyForm } from "@/app/(public)/health-survey/[token]/health-survey-form"

interface Question {
  id: string
  text: string
  order: number
  scoreDirection: "higher_is_better" | "lower_is_better"
}

interface Props {
  token: string
  employeeName: string
  consentStatus: "accepted" | "needs_consent"
  consentTermContent: string | null
  questions: Question[]
}

export function HealthSurveyPageClient({
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
      <HealthSurveyConsentGate
        token={token}
        employeeName={employeeName}
        content={consentTermContent}
        onAccepted={() => setShowSurvey(true)}
      />
    )
  }

  return <HealthSurveyForm token={token} employeeName={employeeName} questions={questions} />
}
