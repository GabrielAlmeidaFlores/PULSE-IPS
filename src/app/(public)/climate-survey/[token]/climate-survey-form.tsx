"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { CheckCircle2, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  submitClimateSurveyAction,
  optOutClimateSurveyAction,
  startClimateSurveyResponseSessionAction,
  trackClimateSurveyResponseProgressAction,
} from "@/app/(public)/climate-survey/[token]/actions"
import { storage } from "@/libs/local-storage"
import { CLIMATE_SURVEY_LIKERT_SCALE } from "@/modules/climate-surveys/climate-survey-metrics"

interface ClimateSurveyQuestion {
  id: string
  text: string
  order: number
  scoreDirection: "higher_is_better" | "lower_is_better"
  dimension: string
  dimensionLabel: string
}

interface LikertOption {
  score: number
  label: string
}

interface ClimateSurveyFormDraft {
  scores: Record<string, number>
  currentIndex: number
  openComment: string
}

const LIKERT_OPTIONS: LikertOption[] = CLIMATE_SURVEY_LIKERT_SCALE.map((point) => ({
  score: point.score,
  label: point.label,
}))

const ANONYMITY_NOTICE =
  "Suas respostas são 100% anônimas e não serão vinculadas à sua identidade."

const ADVANCE_DELAY_MS = 280
const EMPTY_DRAFT_JSON = ""

function subscribeToClimateSurveyDraft(_callback: () => void): () => void {
  return () => {}
}

function getClimateSurveyDraftServerSnapshot(): string {
  return EMPTY_DRAFT_JSON
}

function isValidLikertScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
}

function parseClimateSurveyFormDraft(
  raw: string,
  questionIds: Set<string>,
  questionCount: number,
): ClimateSurveyFormDraft {
  if (raw.length === 0) {
    return { scores: {}, currentIndex: 0, openComment: "" }
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) {
      return { scores: {}, currentIndex: 0, openComment: "" }
    }
    const record = parsed as Record<string, unknown>
    const scoresRaw = record["scores"]
    const indexRaw = record["currentIndex"]
    const openCommentRaw = record["openComment"]
    const scores: Record<string, number> = {}
    if (typeof scoresRaw === "object" && scoresRaw !== null) {
      for (const [questionId, score] of Object.entries(scoresRaw)) {
        if (!questionIds.has(questionId)) continue
        if (!isValidLikertScore(score)) continue
        scores[questionId] = score
      }
    }
    const maxIndex = Math.max(questionCount, 0)
    const currentIndex =
      typeof indexRaw === "number" && Number.isInteger(indexRaw)
        ? Math.min(Math.max(indexRaw, 0), maxIndex)
        : 0
    const openComment = typeof openCommentRaw === "string" ? openCommentRaw : ""
    return { scores, currentIndex, openComment }
  } catch {
    return { scores: {}, currentIndex: 0, openComment: "" }
  }
}

function persistClimateSurveyFormDraft(
  token: string,
  draft: ClimateSurveyFormDraft,
): void {
  storage.setSession(storage.climateSurveyDraftKey(token), JSON.stringify(draft))
}
function clearClimateSurveyFormDraft(token: string): void {
  storage.removeSession(storage.climateSurveyDraftKey(token))
}

interface Props {
  token: string
  employeeName: string
  questions: ClimateSurveyQuestion[]
}

export function ClimateSurveyForm({ token, employeeName, questions }: Props): React.ReactElement {
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order)
  const questionIds = new Set(sortedQuestions.map((question) => question.id))
  const questionCount = sortedQuestions.length

  const draftSnapshot = useSyncExternalStore(
    subscribeToClimateSurveyDraft,
    () => storage.getSession(storage.climateSurveyDraftKey(token)) ?? EMPTY_DRAFT_JSON,
    getClimateSurveyDraftServerSnapshot,
  )
  const restoredDraft = parseClimateSurveyFormDraft(draftSnapshot, questionIds, questionCount)

  const [typedScores, setTypedScores] = useState<Record<string, number> | null>(null)
  const [typedIndex, setTypedIndex] = useState<number | null>(null)
  const [typedOpenComment, setTypedOpenComment] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [optedOut, setOptedOut] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [optingOut, setOptingOut] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [closeHintVisible, setCloseHintVisible] = useState(false)
  const advanceTimerRef = useRef<number | null>(null)
  const sessionStartedRef = useRef(false)

  const scores = typedScores ?? restoredDraft.scores
  const currentIndex = typedIndex ?? restoredDraft.currentIndex
  const openComment = typedOpenComment ?? restoredDraft.openComment

  const firstName = employeeName.split(" ")[0] ?? employeeName
  const totalQuestions = sortedQuestions.length
  const commentStepIndex = totalQuestions
  const isCommentStep = currentIndex >= totalQuestions
  const currentQuestion = !isCommentStep ? sortedQuestions[currentIndex] : undefined
  const topicKeys = Array.from(new Set(sortedQuestions.map((question) => question.dimension)))
  const currentTopicPosition = currentQuestion === undefined ? 0 : topicKeys.indexOf(currentQuestion.dimension) + 1
  const progressPercent = totalQuestions === 0 ? 0 : Math.min(((currentIndex + 1) / totalQuestions) * 100, 100)
  const canGoBack = currentIndex > 0
  const interactionLocked = submitting || advancing || optedOut

  useEffect(() => {
    if (sessionStartedRef.current) return
    sessionStartedRef.current = true
    void startClimateSurveyResponseSessionAction(token)
  }, [token])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  function persistDraft(nextScores: Record<string, number>, nextIndex: number, comment: string): void {
    setTypedScores(nextScores)
    setTypedIndex(nextIndex)
    setTypedOpenComment(comment)
    persistClimateSurveyFormDraft(token, { scores: nextScores, currentIndex: nextIndex, openComment: comment })
  }

  function handleOpenCommentChange(value: string): void {
    setTypedOpenComment(value)
    persistClimateSurveyFormDraft(token, { scores, currentIndex, openComment: value })
  }

  async function submitAllAnswers(nextScores: Record<string, number>, comment: string): Promise<void> {
    const answers: { questionId: string; score: number }[] = []
    for (const question of sortedQuestions) {
      const score = nextScores[question.id]
      if (score === undefined) {
        toast.error("Por favor, responda todas as perguntas.")
        return
      }
      answers.push({ questionId: question.id, score })
    }

    setSubmitting(true)
    const result = await submitClimateSurveyAction(token, answers, comment.trim().length > 0 ? comment.trim() : undefined)
    if (result.error) {
      toast.error(result.error)
      setSubmitting(false)
      return
    }
    clearClimateSurveyFormDraft(token)
    setSubmitted(true)
  }

  function handleSelectScore(score: number): void {
    if (interactionLocked || currentQuestion === undefined) return

    const nextScores = { ...scores, [currentQuestion.id]: score }
    void trackClimateSurveyResponseProgressAction(token, currentQuestion.id, currentQuestion.order)

    const isLastQuestion = currentIndex >= totalQuestions - 1
    const nextIndex = isLastQuestion ? commentStepIndex : Math.min(currentIndex + 1, totalQuestions - 1)
    setTypedScores(nextScores)
    setTypedOpenComment(openComment)
    persistClimateSurveyFormDraft(token, { scores: nextScores, currentIndex: nextIndex, openComment })
    setAdvancing(true)
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
    }
    advanceTimerRef.current = window.setTimeout(() => {
      setTypedIndex(nextIndex)
      setAdvancing(false)
      advanceTimerRef.current = null
    }, ADVANCE_DELAY_MS)
  }

  function handleGoBack(): void {
    if (interactionLocked || !canGoBack) return
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
      setAdvancing(false)
    }
    persistDraft(scores, currentIndex - 1, openComment)
  }

  async function handleOptOut(): Promise<void> {
    setOptingOut(true)
    const result = await optOutClimateSurveyAction(token)
    if (result.error) {
      toast.error(result.error)
      setOptingOut(false)
      return
    }
    clearClimateSurveyFormDraft(token)
    setOptedOut(true)
  }

  function handleClose(): void {
    window.close()
    setCloseHintVisible(true)
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md border border-border bg-card p-6 sm:p-8 text-center" style={{ borderRadius: 0 }}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center bg-status-success-subtle border border-status-success-border">
          <CheckCircle2 className="h-8 w-8 text-status-success" aria-hidden />
        </div>
        <h2 className="text-lg font-bold uppercase tracking-wide mb-2">Obrigado pela sua participação!</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Sua resposta foi registrada com sucesso. Sua opinião ajuda a melhorar o ambiente de trabalho.
        </p>
        <div className="mb-4 space-y-2 text-left">
          <div className="flex items-start gap-2 px-3 py-2.5 bg-status-success-subtle border border-status-success-border">
            <EyeOff className="w-4 h-4 text-status-success shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-status-success leading-relaxed font-medium">{ANONYMITY_NOTICE}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed px-1">
            Os resultados serão compartilhados apenas de forma consolidada, sem identificação individual.
          </p>
        </div>
        <Button type="button" onClick={handleClose} className="w-full h-11">
          Fechar
        </Button>
        {closeHintVisible ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Se a aba não fechar automaticamente, você já pode fechá-la manualmente.
          </p>
        ) : null}
      </div>
    )
  }

  if (optedOut) {
    return (
      <div className="w-full max-w-md border border-border bg-card p-6 text-center" style={{ borderRadius: 0 }}>
        <h2 className="text-lg font-bold uppercase tracking-wide mb-2">Solicitação registrada</h2>
        <p className="text-sm text-muted-foreground">
          Você não receberá mais formulários. Caso mude de ideia, entre em contato com o RH.
        </p>
      </div>
    )
  }

  if (totalQuestions === 0) {
    return (
      <div className="w-full max-w-md border border-border bg-card p-6 text-center" style={{ borderRadius: 0 }}>
        <p className="text-sm text-muted-foreground">Esta pesquisa não possui perguntas ativas.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      <div
        className="sticky top-0 z-10 flex items-start gap-2 px-3 py-2.5 bg-status-success-subtle border border-status-success-border"
        style={{ borderRadius: 0 }}
        role="status"
      >
        <EyeOff className="w-4 h-4 text-status-success shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-status-success leading-relaxed font-medium">{ANONYMITY_NOTICE}</p>
      </div>

      <div className="border border-border bg-card overflow-hidden" style={{ borderRadius: 0 }}>
        <div className="border-b border-border px-4 py-4">
          <h1 className="text-sm font-bold uppercase tracking-widest">Pesquisa de Clima</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Olá, {firstName}!</p>
        </div>

        <div className="px-4 pt-4 pb-2 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {isCommentStep
                ? "Comentário final"
                : `Tópico ${currentTopicPosition} de ${topicKeys.length} · Pergunta ${currentIndex + 1} de ${totalQuestions}`}
            </p>
            <p className="shrink-0 text-[10px] font-semibold text-muted-foreground tabular-nums">
              {Math.round(progressPercent)}%
            </p>
          </div>
          <div
            className="h-1.5 w-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-label="Progresso da pesquisa"
          >
            <div
              className="h-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {isCommentStep ? (
          <div className="px-4 py-5 space-y-4">
            <div>
              <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                Quer acrescentar algo? (opcional)
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Use este espaço para comentários, sugestões ou preocupações.
              </p>
            </div>
            <textarea
              value={openComment}
              onChange={(e) => handleOpenCommentChange(e.target.value)}
              disabled={interactionLocked}
              maxLength={1000}
              rows={5}
              placeholder="Escreva aqui (opcional)..."
              className="w-full bg-input border border-input-border text-foreground text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-y"
              style={{ borderRadius: 0 }}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Para preservar o anonimato, evite citar nomes ou informações que possam identificá-lo.
            </p>
            {submitting ? (
              <p className="text-center text-xs text-muted-foreground">Enviando respostas...</p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void submitAllAnswers(scores, openComment)
                }}
                disabled={interactionLocked}
                className="w-full min-h-12 px-4 py-3 text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                style={{ borderRadius: 0 }}
              >
                Enviar pesquisa
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 py-5 space-y-5">
            <div>
              <span
                className="inline-block border border-border bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                style={{ borderRadius: 0 }}
              >
                {currentQuestion?.dimensionLabel ?? ""}
              </span>
            </div>
            <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">
              {currentQuestion?.text}
            </p>

            <div className="space-y-2" role="group" aria-label="Escala de resposta">
              {LIKERT_OPTIONS.map((option) => {
                const isSelected = currentQuestion !== undefined && scores[currentQuestion.id] === option.score
                return (
                  <button
                    key={option.score}
                    type="button"
                    disabled={interactionLocked}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectScore(option.score)}
                    className={
                      isSelected
                        ? "w-full min-h-12 px-4 py-3 text-left text-sm font-semibold border-2 border-primary bg-primary text-primary-foreground transition-colors disabled:opacity-60"
                        : "w-full min-h-12 px-4 py-3 text-left text-sm font-medium border-2 border-border bg-background text-foreground hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60"
                    }
                    style={{ borderRadius: 0 }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            {submitting ? (
              <p className="text-center text-xs text-muted-foreground">Enviando respostas...</p>
            ) : null}
          </div>
        )}

        <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            disabled={!canGoBack || interactionLocked}
            className="min-h-11 px-2 text-sm font-semibold text-foreground disabled:text-muted-foreground disabled:opacity-40 hover:underline underline-offset-4 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => {
              void handleOptOut()
            }}
            disabled={optingOut || submitting}
            className="min-h-11 px-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {optingOut ? "Processando..." : "Não quero mais participar"}
          </button>
        </div>
      </div>
    </div>
  )
}
