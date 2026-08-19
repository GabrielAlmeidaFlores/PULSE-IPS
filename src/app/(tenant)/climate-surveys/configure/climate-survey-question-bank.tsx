"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Eye } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import {
  CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MAX,
  CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MIN,
  estimateClimateSurveyResponseMinutes,
  getClimateSurveyCatalogByTopic,
  type ClimateSurveyCatalogQuestion,
} from "@/app/(tenant)/climate-surveys/configure/climate-survey-question-catalog"
import type { ClimateSurveyDimension } from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  selectedIds: Set<string>
  onChange: (next: Set<string>) => void
}

function topicRecommendationMessage(count: number): string | null {
  if (count === 0) return null
  if (count < CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MIN) {
    return `Recomendado: ${String(CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MIN)}–${String(CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MAX)} perguntas`
  }
  if (count > CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MAX) {
    return `Acima do recomendado (${String(CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MAX)}). Considere reduzir.`
  }
  return null
}

interface TopicCheckboxProps {
  checked: boolean
  indeterminate: boolean
  label: string
  onChange: () => void
}

function TopicSelectCheckbox({ checked, indeterminate, label, onChange }: TopicCheckboxProps): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current !== null) {
      ref.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="accent-primary shrink-0"
      aria-label={label}
    />
  )
}

export function ClimateSurveyQuestionBankAccordion({ selectedIds, onChange }: Props): React.ReactElement {
  const topics = useMemo(() => getClimateSurveyCatalogByTopic(), [])
  const [openTopics, setOpenTopics] = useState<Set<ClimateSurveyDimension>>(
    () => new Set(topics.map((topic) => topic.dimension)),
  )

  function toggleTopicOpen(dimension: ClimateSurveyDimension): void {
    setOpenTopics((prev) => {
      const next = new Set(prev)
      if (next.has(dimension)) next.delete(dimension)
      else next.add(dimension)
      return next
    })
  }

  function toggleQuestion(questionId: string): void {
    const next = new Set(selectedIds)
    if (next.has(questionId)) next.delete(questionId)
    else next.add(questionId)
    onChange(next)
  }

  function toggleTopicQuestions(questions: ClimateSurveyCatalogQuestion[]): void {
    const ids = questions.map((q) => q.id)
    const allSelected = ids.every((id) => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) {
      for (const id of ids) next.delete(id)
    } else {
      for (const id of ids) next.add(id)
    }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {topics.map((topic) => {
        const selectedInTopic = topic.questions.filter((q) => selectedIds.has(q.id)).length
        const allSelected = topic.questions.length > 0 && topic.questions.every((q) => selectedIds.has(q.id))
        const someSelected = selectedInTopic > 0 && !allSelected
        const isOpen = openTopics.has(topic.dimension)
        const recommendation = topicRecommendationMessage(selectedInTopic)

        return (
          <div key={topic.dimension} className="border border-border bg-card">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 border-b border-border">
              <TopicSelectCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                label={`Selecionar todas as perguntas de ${topic.label}`}
                onChange={() => toggleTopicQuestions(topic.questions)}
              />
              <button
                type="button"
                onClick={() => toggleTopicOpen(topic.dimension)}
                className="flex-1 flex items-center justify-between gap-2 text-left min-w-0"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-widest text-foreground truncate">
                    {topic.label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    {selectedInTopic} de {topic.questions.length} selecionada(s)
                    {recommendation !== null ? ` · ${recommendation}` : ""}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
            {isOpen && (
              <div className="divide-y divide-border">
                {topic.questions.map((question) => {
                  const checked = selectedIds.has(question.id)
                  return (
                    <label
                      key={question.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleQuestion(question.id)}
                        className="accent-primary mt-0.5 shrink-0"
                      />
                      <span className="text-sm text-foreground leading-snug">{question.text}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface SidePanelProps {
  selectedQuestions: ClimateSurveyCatalogQuestion[]
  selectedTopicCount: number
  onPreview: () => void
  onSave: () => void
  saving: boolean
  saveLabel: string
}

export function ClimateSurveyQuestionBankSidePanel({
  selectedQuestions,
  selectedTopicCount,
  onPreview,
  onSave,
  saving,
  saveLabel,
}: SidePanelProps): React.ReactElement {
  const questionCount = selectedQuestions.length
  const estimatedMinutes = estimateClimateSurveyResponseMinutes(questionCount)

  return (
    <aside className="border border-border bg-card lg:sticky lg:top-4">
      <div className="border-b border-border px-4 py-2.5 bg-muted">
        <p className="text-[10px] font-black tracking-widest uppercase text-foreground">Resumo da pesquisa</p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Perguntas</p>
          <p className="text-3xl font-bold tabular-nums text-foreground mt-1">{questionCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tópicos</p>
          <p className="text-3xl font-bold tabular-nums text-foreground mt-1">{selectedTopicCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tempo estimado</p>
          <p className="text-3xl font-bold tabular-nums text-foreground mt-1">
            {questionCount === 0 ? "—" : `≈ ${String(estimatedMinutes)} min`}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cálculo aproximado (20s por pergunta).
          </p>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || questionCount === 0}
            className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: 0 }}
          >
            {saving ? "Salvando..." : saveLabel}
          </button>
          <button
            type="button"
            onClick={onPreview}
            disabled={questionCount === 0}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: 0 }}
          >
            <Eye className="h-3.5 w-3.5" />
            Pré-visualizar pesquisa
          </button>
        </div>
      </div>
    </aside>
  )
}

interface PreviewProps {
  open: boolean
  onClose: () => void
  surveyName: string
  questions: ClimateSurveyCatalogQuestion[]
}

export function ClimateSurveyQuestionBankPreviewModal({
  open,
  onClose,
  surveyName,
  questions,
}: PreviewProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ borderRadius: 0 }}>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest">Pré-visualização</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {surveyName} · {questions.length} pergunta(s) · escala 1 a 5
          </p>
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="border border-border px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Pergunta {index + 1}
                </p>
                <p className="text-sm text-foreground leading-snug">{question.text}</p>
                <div className="mt-3 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <span
                      key={score}
                      className="flex-1 py-2 text-center text-[11px] font-bold border border-border text-muted-foreground"
                    >
                      {score}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <DialogClose
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              style={{ borderRadius: 0 }}
            >
              Fechar
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

export function validateClimateSurveyQuestionSelection(selectedQuestions: ClimateSurveyCatalogQuestion[]): string | null {
  if (selectedQuestions.length === 0) {
    return "Selecione ao menos uma pergunta."
  }

  const byTopic = new Map<ClimateSurveyDimension, number>()
  for (const question of selectedQuestions) {
    byTopic.set(question.dimension, (byTopic.get(question.dimension) ?? 0) + 1)
  }

  for (const count of byTopic.values()) {
    if (count < 1) {
      return "Cada tópico selecionado precisa de ao menos 1 pergunta."
    }
  }

  if (selectedQuestions.length > 40) {
    return "Selecione no máximo 40 perguntas."
  }

  return null
}
