"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { ChevronDown, Eye, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { NativeSelect } from "@/components/ui/native-select"
import { extractClimateSurveyQuestionsAction } from "@/app/(tenant)/climate-surveys/configure/actions"
import {
  CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MAX,
  CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MIN,
  estimateClimateSurveyResponseMinutes,
  getClimateSurveyCatalogByTopic,
  type ClimateSurveyCatalogQuestion,
} from "@/app/(tenant)/climate-surveys/configure/climate-survey-question-catalog"
import {
  CLIMATE_SURVEY_MAX_QUESTIONS,
  toClimateSurveyDimension,
  type ClimateSurveyDimension,
  type ClimateSurveyTopicOption,
  type ScoreDirection,
} from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  selectedIds: Set<string>
  onChange: (next: Set<string>) => void
}

export interface ClimateSurveyCustomQuestionDraft {
  localId: string
  text: string
  scoreDirection: ScoreDirection
  dimension: ClimateSurveyDimension
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

  if (selectedQuestions.length > CLIMATE_SURVEY_MAX_QUESTIONS) {
    return `Selecione no máximo ${String(CLIMATE_SURVEY_MAX_QUESTIONS)} perguntas.`
  }

  return null
}

interface CustomQuestionListProps {
  questions: ClimateSurveyCustomQuestionDraft[]
  topics: ClimateSurveyTopicOption[]
  onChange: (next: ClimateSurveyCustomQuestionDraft[]) => void
}

const customQuestionInputCls =
  "w-full bg-input border border-input-border text-foreground text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

export function ClimateSurveyCustomQuestionList({ questions, topics, onChange }: CustomQuestionListProps): React.ReactElement {
  const [isImporting, startImportTransition] = useTransition()
  const importInputRef = useRef<HTMLInputElement>(null)

  function resolveDefaultTopicKey(): ClimateSurveyDimension {
    return topics.find((topic) => topic.isActive)?.key ?? "organizational_culture"
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file === undefined) return
    startImportTransition(async () => {
      const formData = new FormData()
      formData.set("file", file)
      const result = await extractClimateSurveyQuestionsAction(formData)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      const imported = (result.questions ?? []).map((question) => ({
        localId: crypto.randomUUID(),
        text: question.text,
        dimension: question.dimension,
        scoreDirection: question.scoreDirection,
      }))
      if (imported.length === 0) {
        toast.error("Nenhuma pergunta foi identificada no arquivo.")
        return
      }
      onChange([...questions, ...imported])
      toast.success(`${String(imported.length)} pergunta(s) importada(s).`)
    })
  }

  function addCustomQuestion(): void {
    onChange([
      ...questions,
      {
        localId: crypto.randomUUID(),
        text: "",
        scoreDirection: "higher_is_better",
        dimension: resolveDefaultTopicKey(),
      },
    ])
  }

  function updateCustomQuestion(localId: string, patch: Partial<ClimateSurveyCustomQuestionDraft>): void {
    onChange(questions.map((q) => (q.localId === localId ? { ...q, ...patch } : q)))
  }

  function removeCustomQuestion(localId: string): void {
    onChange(questions.filter((q) => q.localId !== localId))
  }

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Perguntas personalizadas</p>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {questions.length} adicionada(s)
        </span>
      </div>
      {questions.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Nenhuma pergunta personalizada. Adicione perguntas próprias além dos tópicos do catálogo.
        </p>
      )}
      {questions.map((question) => (
        <div key={question.localId} className="border border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
              <NativeSelect
                value={question.dimension}
                onChange={(e) => updateCustomQuestion(question.localId, { dimension: toClimateSurveyDimension(e.target.value) })}
              >
                {topics.map((topic) => (
                  <option key={topic.key} value={topic.key} disabled={!topic.isActive}>
                    {topic.isActive ? topic.label : `${topic.label} (desativado)`}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                value={question.scoreDirection}
                onChange={(e) => updateCustomQuestion(question.localId, { scoreDirection: e.target.value as ScoreDirection })}
              >
                <option value="higher_is_better">Maior é melhor</option>
                <option value="lower_is_better">Menor é melhor</option>
              </NativeSelect>
            </div>
            <button
              type="button"
              onClick={() => removeCustomQuestion(question.localId)}
              className="shrink-0 p-1 text-muted-foreground hover:text-status-danger transition-colors"
              style={{ borderRadius: 0 }}
              title="Remover pergunta"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            value={question.text}
            onChange={(e) => updateCustomQuestion(question.localId, { text: e.target.value })}
            placeholder="Digite o texto da pergunta personalizada..."
            className={customQuestionInputCls}
            style={{ borderRadius: 0 }}
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addCustomQuestion}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          style={{ borderRadius: 0 }}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar pergunta personalizada
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ borderRadius: 0 }}
        >
          <Upload className="h-3.5 w-3.5" />
          {isImporting ? "Importando..." : "Importar de arquivo (.xlsx/.csv/.pdf)"}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.csv,.txt,.pdf"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
    </div>
  )
}
