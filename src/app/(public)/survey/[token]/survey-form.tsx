"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { submitSurveyAction, optOutSurveyAction } from "@/app/(public)/survey/[token]/actions"

interface Question {
  id: string
  text: string
  order: number
}

interface Props {
  token: string
  questions: Question[]
}

export function SurveyForm({ token, questions }: Props): React.ReactElement {
  const [scores, setScores] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [optedOut, setOptedOut] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [optingOut, setOptingOut] = useState(false)

  async function handleSubmit(): Promise<void> {
    const answers = Object.entries(scores).map(([questionId, score]) => ({ questionId, score }))
    if (answers.length !== questions.length) {
      toast.error("Por favor, responda todas as perguntas")
      return
    }
    setSubmitting(true)
    const result = await submitSurveyAction(token, answers)
    if (result.error) {
      toast.error(result.error)
      setSubmitting(false)
      return
    }
    setSubmitted(true)
  }

  async function handleOptOut(): Promise<void> {
    setOptingOut(true)
    const result = await optOutSurveyAction(token)
    if (result.error) {
      toast.error(result.error)
      setOptingOut(false)
      return
    }
    setOptedOut(true)
  }

  if (submitted) {
    return (
      <div className="w-full max-w-lg border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-bold uppercase tracking-wide mb-2">Obrigado!</h2>
        <p className="text-sm text-muted-foreground">Sua resposta foi registrada com sucesso.</p>
      </div>
    )
  }

  if (optedOut) {
    return (
      <div className="w-full max-w-lg border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-bold uppercase tracking-wide mb-2">Solicitacao registrada</h2>
        <p className="text-sm text-muted-foreground">
          Voce nao recebera mais formularios. Caso mude de ideia, entre em contato com o RH.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-sm font-bold uppercase tracking-widest">Pesquisa de Bem-Estar</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Avalie cada item de 1 (muito ruim) a 5 (excelente)</p>
      </div>
      <div className="p-6 space-y-6">
        {questions.map((q) => (
          <div key={q.id} className="space-y-3">
            <p className="text-sm font-medium">{q.text}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setScores((prev) => ({ ...prev, [q.id]: score }))}
                  className={`w-11 h-11 border-2 font-bold text-sm transition-colors ${  scores[q.id] === score ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:text-primary"}`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-11">
          {submitting ? "Enviando..." : "Enviar resposta"}
        </Button>
        <div className="text-center">
          <button
            type="button"
            onClick={handleOptOut}
            disabled={optingOut}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {optingOut ? "Processando..." : "Nao quero mais participar"}
          </button>
        </div>
      </div>
    </div>
  )
}
