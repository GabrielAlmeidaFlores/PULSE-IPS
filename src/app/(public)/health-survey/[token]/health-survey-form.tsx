"use client"

import { useState } from "react"
import { toast } from "sonner"
import { EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { submitHealthSurveyAction, optOutHealthSurveyAction } from "@/app/(public)/health-survey/[token]/actions"

interface Question {
  id: string
  text: string
  order: number
  scoreDirection: "higher_is_better" | "lower_is_better"
}

type ScoreHealthLevel = "good" | "neutral" | "bad"

function getScoreHealthLevel(score: number, scoreDirection: "higher_is_better" | "lower_is_better"): ScoreHealthLevel {
  const normalized = scoreDirection === "higher_is_better" ? score : 6 - score
  if (normalized >= 4) return "good"
  if (normalized === 3) return "neutral"
  return "bad"
}

function getScoreButtonClass(score: number, scoreDirection: "higher_is_better" | "lower_is_better", isSelected: boolean): string {
  const level = getScoreHealthLevel(score, scoreDirection)
  const base = "flex-1 h-11 rounded-none border-2 font-bold text-sm transition-all"

  if (isSelected) {
    const selected: Record<ScoreHealthLevel, string> = {
      good: "bg-status-success border-status-success text-primary-foreground scale-105 shadow-sm",
      neutral: "bg-status-warning border-status-warning text-primary-foreground scale-105 shadow-sm",
      bad: "bg-status-danger border-status-danger text-primary-foreground scale-105 shadow-sm",
    }
    return `${base} ${selected[level]}`
  }

  const idle: Record<ScoreHealthLevel, string> = {
    good: "border-border bg-background hover:border-status-success hover:text-status-success",
    neutral: "border-border bg-background hover:border-status-warning hover:text-status-warning",
    bad: "border-border bg-background hover:border-status-danger hover:text-status-danger",
  }
  return `${base} ${idle[level]}`
}

interface Props {
  token: string
  employeeName: string
  questions: Question[]
}

export function HealthSurveyForm({ token, employeeName, questions }: Props): React.ReactElement {
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
    const result = await submitHealthSurveyAction(token, answers)
    if (result.error) {
      toast.error(result.error)
      setSubmitting(false)
      return
    }
    setSubmitted(true)
  }

  async function handleOptOut(): Promise<void> {
    setOptingOut(true)
    const result = await optOutHealthSurveyAction(token)
    if (result.error) {
      toast.error(result.error)
      setOptingOut(false)
      return
    }
    setOptedOut(true)
  }

  if (submitted) {
    return (
      <div className="w-full max-w-lg border border-border bg-card p-6 sm:p-8 text-center" style={{ borderRadius: 0 }}>
        <h2 className="text-lg font-bold uppercase tracking-wide mb-2">Obrigado!</h2>
        <p className="text-sm text-muted-foreground">Sua resposta foi registrada com sucesso.</p>
      </div>
    )
  }

  if (optedOut) {
    return (
      <div className="w-full max-w-lg border border-border bg-card p-6 sm:p-8 text-center" style={{ borderRadius: 0 }}>
        <h2 className="text-lg font-bold uppercase tracking-wide mb-2">Solicitação registrada</h2>
        <p className="text-sm text-muted-foreground">
          Você não receberá mais formulários. Caso mude de ideia, entre em contato com o RH.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-4 sm:px-6 py-4">
        <h1 className="text-sm font-bold uppercase tracking-widest">Pesquisa de Bem-Estar</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Olá, {employeeName.split(" ")[0]}! Avalie cada item de 1 a 5.
        </p>
      </div>
      <div className="flex items-start gap-2 px-4 sm:px-6 py-3 bg-status-success-subtle border-b border-status-success-border">
        <EyeOff className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
        <p className="text-xs text-status-success leading-relaxed">
          <strong>100% anônimo.</strong> Suas respostas não são vinculadas ao seu nome — ninguém sabe quem respondeu o quê.
        </p>
      </div>
      <div className="p-4 sm:p-6 space-y-6">
        {questions.map((q) => {
          const leftLabel = q.scoreDirection === "higher_is_better" ? "Negativo" : "Positivo"
          const rightLabel = q.scoreDirection === "higher_is_better" ? "Positivo" : "Negativo"
          return (
            <div key={q.id} className="space-y-3">
              <p className="text-sm font-medium">{q.text}</p>
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      aria-label={`Nota ${score} de 5`}
                      aria-pressed={scores[q.id] === score}
                      onClick={() => setScores((prev) => ({ ...prev, [q.id]: score }))}
                      className={getScoreButtonClass(score, q.scoreDirection, scores[q.id] === score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1 = {leftLabel}</span>
                  <span>5 = {rightLabel}</span>
                </div>
              </div>
            </div>
          )
        })}
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
            {optingOut ? "Processando..." : "Não quero mais participar"}
          </button>
        </div>
      </div>
    </div>
  )
}
