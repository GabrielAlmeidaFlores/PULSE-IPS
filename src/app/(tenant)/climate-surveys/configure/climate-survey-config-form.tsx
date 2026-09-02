"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { PageHelp } from "@/components/page-help"
import { ConfirmActionModal } from "@/components/confirm-action-modal"
import { NativeSelect } from "@/components/ui/native-select"
import {
  toClimateSurveyDimension,
  type ClimateSurveyDimension,
  type ScoreDirection,
} from "@/modules/climate-surveys/climate-survey.types"
import type { ClimateSurveyConfigWithDetails } from "@/modules/climate-surveys/climate-survey-config.service"
import {
  CLIMATE_SURVEY_QUESTION_CATALOG,
  CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MAX,
  CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MIN,
  matchCatalogIdsFromQuestions,
} from "@/app/(tenant)/climate-surveys/configure/climate-survey-question-catalog"
import {
  ClimateSurveyCustomQuestionList,
  ClimateSurveyQuestionBankAccordion,
  ClimateSurveyQuestionBankPreviewModal,
  ClimateSurveyQuestionBankSidePanel,
  validateClimateSurveyQuestionSelection,
  type ClimateSurveyCustomQuestionDraft,
} from "@/app/(tenant)/climate-surveys/configure/climate-survey-question-bank"

interface DepartmentOption {
  id: string
  name: string
}

type FormMode = "create" | "edit"

interface ClimateSurveyConfigFormProps {
  mode: FormMode
  departments?: DepartmentOption[]
  initialConfig?: ClimateSurveyConfigWithDetails | null
  initialDeptIds?: string[]
  onSubmit: (data: ClimateSurveyConfigFormData) => Promise<{ error?: string } | undefined>
  cancelHref: string
}

export interface ClimateSurveyConfigFormData {
  name: string
  description: string
  departmentIds: string[] | "all"
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly" | "once" | "quarterly" | "semiannual"
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  respectEmployeeSchedule: boolean
  tokenExpiryHours: number
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  questions: { text: string; order: number; scoreDirection: ScoreDirection; dimension: ClimateSurveyDimension }[]
}

const inputCls =
  "w-full bg-input border border-input-border text-foreground text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

const WEEK_DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
]

const MAX_DAYS_BY_FREQUENCY: Record<string, number> = {
  once: 7,
  daily: 7,
  twice_weekly: 2,
  weekly: 1,
  biweekly: 1,
  monthly: 7,
  quarterly: 7,
  semiannual: 7,
}

const DEFAULT_WORK_DAYS_BY_FREQUENCY: Record<string, number[]> = {
  once: [1, 2, 3, 4, 5],
  daily: [1, 2, 3, 4, 5],
  twice_weekly: [1, 3],
  weekly: [1],
  biweekly: [1],
  monthly: [1, 2, 3, 4, 5],
  quarterly: [1, 2, 3, 4, 5],
  semiannual: [1, 2, 3, 4, 5],
}

const FREQUENCY_DAY_HINT: Record<string, string | null> = {
  once: "Pesquisa única: o disparo automático fica desativado; use Disparo & Canais.",
  daily: "A pesquisa será enviada uma vez por dia nos dias marcados.",
  twice_weekly: "Selecione exatamente 2 dias",
  weekly: "Selecione exatamente 1 dia",
  biweekly: "Selecione exatamente 1 dia",
  monthly: null,
  quarterly: "Intervalo de cerca de 90 dias entre ondas automáticas.",
  semiannual: "Intervalo de cerca de 180 dias entre ondas automáticas.",
}

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1)

const DEFAULT_SELECTED_IDS = new Set(
  CLIMATE_SURVEY_QUESTION_CATALOG
    .filter((q) => q.id.endsWith("-1") || q.id.endsWith("-2") || q.id.endsWith("-3"))
    .map((q) => q.id),
)

function buildDepartmentIds(mode: FormMode, allDepts: boolean, selectedDeptIds: Set<string>): string[] | "all" {
  if (mode === "create" && allDepts) return "all"
  return Array.from(selectedDeptIds)
}

function submitLabel(_mode: FormMode): string {
  return "Salvar pesquisa"
}

interface ConfigSaveStatusProps {
  justSaved: boolean
  hasUnsavedChanges: boolean
}

function ConfigSaveStatus({ justSaved, hasUnsavedChanges }: ConfigSaveStatusProps): React.ReactElement | null {
  if (justSaved) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-widest text-status-success">✓ Salvo</span>
    )
  }
  if (hasUnsavedChanges) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-widest text-status-warning">
        Alterações não salvas
      </span>
    )
  }
  return null
}

interface CancelSurveyConfigLinkProps {
  href: string
  hasUnsavedChanges: boolean
}

function CancelSurveyConfigLink({ href, hasUnsavedChanges }: CancelSurveyConfigLinkProps): React.ReactElement {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const linkClassName =
    "block text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"

  if (!hasUnsavedChanges) {
    return (
      <Link href={href} className={linkClassName} style={{ borderRadius: 0 }}>
        Cancelar
      </Link>
    )
  }

  return (
    <>
      <Link
        href={href}
        onClick={(event) => {
          event.preventDefault()
          setConfirmOpen(true)
        }}
        className={linkClassName}
        style={{ borderRadius: 0 }}
      >
        Cancelar
      </Link>
      <ConfirmActionModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          router.push(href)
        }}
        title="Descartar alterações?"
        description="Você tem alterações não salvas nesta pesquisa. Deseja sair e descartá-las?"
        confirmLabel="Descartar"
        variant="warning"
      />
    </>
  )
}

export function ClimateSurveyConfigForm({ mode, departments, initialConfig, initialDeptIds, onSubmit, cancelHref }: ClimateSurveyConfigFormProps): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [previewOpen, setPreviewOpen] = useState(false)

  const [name, setName] = useState(initialConfig?.name ?? "Pesquisa de Clima")
  const [description, setDescription] = useState(initialConfig?.description ?? "")
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<string>>(() => {
    if (initialDeptIds !== undefined && initialDeptIds.length > 0) return new Set(initialDeptIds)
    if (initialConfig !== null && initialConfig !== undefined) return new Set(initialConfig.configDepartments.map((cd) => cd.department.id))
    return new Set()
  })
  const [allDepts, setAllDepts] = useState(false)
  const initialFreq = (initialConfig?.frequency as "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly" | "once" | "quarterly" | "semiannual") ?? "weekly"
  const [frequency, setFrequency] = useState<"daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly" | "once" | "quarterly" | "semiannual">(initialFreq)
  const [scheduledDayOfMonth, setScheduledDayOfMonth] = useState<number | null>(initialConfig?.scheduledDayOfMonth ?? null)
  const [dispatchTime, setDispatchTime] = useState(initialConfig?.dispatchTime ?? "09:00")
  const [respectEmployeeSchedule, setRespectEmployeeSchedule] = useState(initialConfig?.respectEmployeeSchedule ?? false)
  const [tokenExpiryHours, setTokenExpiryHours] = useState(initialConfig?.tokenExpiryHours ?? 48)
  const [tokenExpiryHoursRaw, setTokenExpiryHoursRaw] = useState(String(initialConfig?.tokenExpiryHours ?? 48))
  const [workDays, setWorkDays] = useState(() => {
    if (initialConfig !== null && initialConfig !== undefined) {
      return new Set(initialConfig.workDays.map((w) => w.dayOfWeek))
    }
    return new Set(DEFAULT_WORK_DAYS_BY_FREQUENCY[initialFreq] ?? [1])
  })
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(() => {
    if (initialConfig === null || initialConfig === undefined) return new Set(DEFAULT_SELECTED_IDS)
    if (initialConfig.questions.length === 0) return new Set(DEFAULT_SELECTED_IDS)
    return matchCatalogIdsFromQuestions(
      initialConfig.questions.map((q) => ({
        text: q.text,
        dimension: toClimateSurveyDimension(q.dimension),
      })),
    )
  })

  const [customQuestions, setCustomQuestions] = useState<ClimateSurveyCustomQuestionDraft[]>(() => {
    if (initialConfig === null || initialConfig === undefined) return []
    const catalogQuestionKeys = new Set(
      CLIMATE_SURVEY_QUESTION_CATALOG.map((q) => `${q.text}::${q.dimension}`),
    )
    return initialConfig.questions
      .filter((q) => !catalogQuestionKeys.has(`${q.text}::${toClimateSurveyDimension(q.dimension)}`))
      .map((q, index) => ({
        localId: `custom-${String(index)}`,
        text: q.text,
        scoreDirection: q.scoreDirection === "lower_is_better" ? "lower_is_better" : "higher_is_better",
        dimension: toClimateSurveyDimension(q.dimension),
      }))
  })

  const selectedCatalogQuestions = useMemo(
    () => CLIMATE_SURVEY_QUESTION_CATALOG.filter((q) => selectedQuestionIds.has(q.id)),
    [selectedQuestionIds],
  )

  const previewQuestions = useMemo(
    () => [
      ...selectedCatalogQuestions,
      ...customQuestions.map((q) => ({
        id: q.localId,
        text: q.text,
        scoreDirection: q.scoreDirection,
        dimension: q.dimension,
      })),
    ],
    [selectedCatalogQuestions, customQuestions],
  )

  const selectedTopicCount = useMemo(() => {
    const topics = new Set(previewQuestions.map((q) => q.dimension))
    return topics.size
  }, [previewQuestions])

  const [justSaved, setJustSaved] = useState(false)

  function buildFormSnapshot(): string {
    return JSON.stringify({
      name,
      description,
      frequency,
      scheduledDayOfMonth,
      dispatchTime,
      respectEmployeeSchedule,
      tokenExpiryHours,
      workDays: Array.from(workDays).sort((a, b) => a - b),
      deptIds: allDepts ? "__all__" : Array.from(selectedDeptIds).sort(),
      questionIds: Array.from(selectedQuestionIds).sort(),
      customQuestions: customQuestions.map((q) => ({
        text: q.text.trim(),
        scoreDirection: q.scoreDirection,
        dimension: q.dimension,
      })),
    })
  }

  const [initialFormSnapshot] = useState<string>(() => buildFormSnapshot())
  const hasUnsavedChanges = buildFormSnapshot() !== initialFormSnapshot

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault()
    }
    if (!hasUnsavedChanges) return
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [hasUnsavedChanges])

  function toggleDay(value: number): void {
    setWorkDays((prev) => {
      const next = new Set(prev)
      const maxDays = MAX_DAYS_BY_FREQUENCY[frequency] ?? 7
      if (next.has(value)) {
        if (next.size > 1) next.delete(value)
      } else if (next.size < maxDays) {
        next.add(value)
      } else if (maxDays === 1) {
        next.clear()
        next.add(value)
      }
      return next
    })
  }

  function toggleDept(deptId: string): void {
    setSelectedDeptIds((prev) => {
      const next = new Set(prev)
      if (next.has(deptId)) next.delete(deptId)
      else next.add(deptId)
      return next
    })
  }

  function toggleAllDepts(): void {
    setAllDepts((prev) => {
      const next = !prev
      if (next) setSelectedDeptIds(new Set())
      return next
    })
  }

  function handleSubmit(): void {
    if (!name.trim()) { toast.error("Informe o nome da pesquisa"); return }
    if (!allDepts && selectedDeptIds.size === 0) { toast.error("Selecione ao menos um setor"); return }
    if (frequency === "monthly" && scheduledDayOfMonth === null) { toast.error("Selecione o dia do mês para o envio mensal"); return }
    const maxDays = MAX_DAYS_BY_FREQUENCY[frequency] ?? 7
    if (frequency !== "monthly" && workDays.size !== maxDays && maxDays < 7) {
      toast.error(`Selecione exatamente ${String(maxDays)} ${maxDays === 1 ? "dia" : "dias"} para a frequência escolhida.`)
      return
    }

    if (customQuestions.some((q) => q.text.trim() === "")) {
      toast.error("Informe o texto de todas as perguntas personalizadas.")
      return
    }

    const selectionError = validateClimateSurveyQuestionSelection(previewQuestions)
    if (selectionError !== null) {
      toast.error(selectionError)
      return
    }

    const underRecommended = [...new Set(selectedCatalogQuestions.map((q) => q.dimension))].some((dimension) => {
      const count = selectedCatalogQuestions.filter((q) => q.dimension === dimension).length
      return count > 0 && count < CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MIN
    })
    if (underRecommended) {
      toast.message(`Recomendamos ${String(CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MIN)} a ${String(CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MAX)} perguntas por tópico.`)
    }

    const questions = previewQuestions.map((q, index) => ({
      text: q.text.trim(),
      order: index + 1,
      scoreDirection: q.scoreDirection,
      dimension: q.dimension,
    }))

    const departmentIds: string[] | "all" = buildDepartmentIds(mode, allDepts, selectedDeptIds)

    startTransition(async () => {
      const result = await onSubmit({
        name: name.trim(),
        description: description.trim(),
        departmentIds,
        frequency,
        scheduledDayOfMonth: frequency === "monthly" ? scheduledDayOfMonth : null,
        dispatchTime,
        workDays: Array.from(workDays).sort((a, b) => a - b),
        respectEmployeeSchedule,
        tokenExpiryHours,
        sendViaMessaging: true,
        sendViaSignedLink: false,
        questions,
      })
      if (result?.error) {
        toast.error(result.error)
      } else {
        setJustSaved(true)
        toast.success(mode === "create" ? "Pesquisa criada com sucesso" : "Pesquisa atualizada com sucesso")
        window.setTimeout(() => {
          router.push("/climate-surveys/configure")
        }, 700)
      }
    })
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4 lg:items-start">
      <div className="space-y-4 min-w-0">
        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <div className="border-b border-border px-4 py-2.5 bg-muted">
            <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Identificação</span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Nome da pesquisa</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Pesquisa de Bem-estar, Clima Organizacional..."
                className={inputCls}
                style={{ borderRadius: 0 }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo desta pesquisa..."
                rows={3}
                className={`${inputCls} resize-y`}
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>
        </div>

        {departments !== undefined && (
          <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
            <div className="border-b border-border px-4 py-2.5 bg-muted">
              <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Setores</span>
            </div>
            <div className="p-4 space-y-2">
              {mode === "create" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={allDepts} onChange={toggleAllDepts} className="accent-primary" />
                  <span className="text-[12px] font-semibold text-foreground">Todos os setores</span>
                </label>
              )}
              {!allDepts && (
                <div className="space-y-1 mt-2">
                  {departments.map((dept) => (
                    <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDeptIds.has(dept.id)}
                        onChange={() => toggleDept(dept.id)}
                        className="accent-primary"
                      />
                      <span className="text-[12px] text-foreground">{dept.name}</span>
                    </label>
                  ))}
                  {departments.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">Nenhum setor ativo encontrado.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <div className="border-b border-border px-4 py-2.5 bg-muted flex items-center gap-1.5">
            <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Configuração de envio</span>
            <PageHelp content={
              <div className="space-y-3 text-[12px] leading-relaxed">
                <div>
                  <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Frequência</p>
                  <p className="text-foreground">Defina quando a pesquisa será enviada automaticamente.</p>
                </div>
              </div>
            } />
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Frequência de envio</label>
              <NativeSelect
                value={frequency}
                onChange={(e) => {
                  const newFreq = e.target.value as typeof frequency
                  setFrequency(newFreq)
                  if (newFreq !== "monthly") setScheduledDayOfMonth(null)
                  const maxDays = MAX_DAYS_BY_FREQUENCY[newFreq] ?? 7
                  setWorkDays((prev) => {
                    if (prev.size <= maxDays) return prev
                    return new Set(DEFAULT_WORK_DAYS_BY_FREQUENCY[newFreq] ?? [1])
                  })
                }}
              >
                <option value="once">Pesquisa única</option>
                <option value="daily">Diária</option>
                <option value="twice_weekly">2× por semana</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="semiannual">Semestral</option>
              </NativeSelect>
            </div>

            {frequency === "monthly" ? (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Dia do mês para envio</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_OF_MONTH_OPTIONS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setScheduledDayOfMonth(day)}
                      className={`min-h-11 min-w-11 text-[11px] font-bold border transition-colors ${
                        scheduledDayOfMonth === day
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dias de envio</label>
                  {(MAX_DAYS_BY_FREQUENCY[frequency] ?? 7) < 7 && (
                    <span className={`text-[10px] font-medium ${
                      workDays.size === (MAX_DAYS_BY_FREQUENCY[frequency] ?? 7)
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}>
                      {workDays.size}/{MAX_DAYS_BY_FREQUENCY[frequency] ?? 7} selecionados
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEK_DAYS.map((d) => {
                    const maxDays = MAX_DAYS_BY_FREQUENCY[frequency] ?? 7
                    const isSelected = workDays.has(d.value)
                    const isDisabled = !isSelected && workDays.size >= maxDays && maxDays !== 1
                    function dayButtonCls(): string {
                      if (isSelected) return "border-primary bg-primary text-primary-foreground"
                      if (isDisabled) return "border-border text-muted-foreground/40 cursor-not-allowed"
                      return "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        disabled={isDisabled}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${dayButtonCls()}`}
                        style={{ borderRadius: 0 }}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
                {FREQUENCY_DAY_HINT[frequency] !== null && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">{FREQUENCY_DAY_HINT[frequency]}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Horário de disparo</label>
              <input
                type="time"
                value={dispatchTime}
                onChange={(e) => setDispatchTime(e.target.value)}
                className={inputCls}
                style={{ borderRadius: 0 }}
              />
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={respectEmployeeSchedule}
                onChange={(e) => setRespectEmployeeSchedule(e.target.checked)}
                className="accent-primary mt-0.5 shrink-0"
              />
              <span className="text-[12px] text-foreground leading-snug">
                <span className="font-semibold">Respeitar horário individual do colaborador</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  A mensagem será enviada no início do turno de cada colaborador.
                </span>
              </span>
            </label>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Validade do link (horas)</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={tokenExpiryHoursRaw}
                onChange={(e) => {
                  setTokenExpiryHoursRaw(e.target.value)
                  const parsed = parseInt(e.target.value, 10)
                  if (!isNaN(parsed)) {
                    setTokenExpiryHours(Math.min(1000, Math.max(1, parsed)))
                  }
                }}
                onBlur={() => {
                  const parsed = parseInt(tokenExpiryHoursRaw, 10)
                  const coerced = isNaN(parsed) ? 48 : Math.min(1000, Math.max(1, parsed))
                  setTokenExpiryHours(coerced)
                  setTokenExpiryHoursRaw(String(coerced))
                }}
                className={inputCls}
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>
        </div>

        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <div className="border-b border-border px-4 py-2.5 bg-muted flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-black tracking-widest uppercase text-foreground">
                Banco de perguntas
              </span>
              <PageHelp content={
                <div className="space-y-3 text-[12px] leading-relaxed">
                  <p className="text-foreground">
                    Selecione perguntas por tópico. Cada tópico com seleção precisa de pelo menos 1 pergunta.
                  </p>
                  <p className="text-foreground">
                    Recomendamos de {CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MIN} a {CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MAX} perguntas por tópico.
                  </p>
                </div>
              } />
            </div>
            <span className="flex items-center gap-3 shrink-0">
              <ConfigSaveStatus justSaved={justSaved} hasUnsavedChanges={hasUnsavedChanges} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {previewQuestions.length} selecionada(s)
              </span>
            </span>
          </div>
          <div className="p-3">
            <ClimateSurveyQuestionBankAccordion
              selectedIds={selectedQuestionIds}
              onChange={setSelectedQuestionIds}
            />
          </div>
          <div className="p-3 pt-0">
            <ClimateSurveyCustomQuestionList questions={customQuestions} onChange={setCustomQuestions} />
          </div>
        </div>

        <div className="lg:hidden space-y-2">
          <ClimateSurveyQuestionBankSidePanel
            selectedQuestions={previewQuestions}
            selectedTopicCount={selectedTopicCount}
            onPreview={() => setPreviewOpen(true)}
            onSave={handleSubmit}
            saving={isPending}
            saveLabel={submitLabel(mode)}
          />
          <CancelSurveyConfigLink href={cancelHref} hasUnsavedChanges={hasUnsavedChanges} />
        </div>
      </div>

      <div className="hidden lg:block space-y-2">
        <ClimateSurveyQuestionBankSidePanel
          selectedQuestions={previewQuestions}
          selectedTopicCount={selectedTopicCount}
          onPreview={() => setPreviewOpen(true)}
          onSave={handleSubmit}
          saving={isPending}
          saveLabel={submitLabel(mode)}
        />
        <CancelSurveyConfigLink href={cancelHref} hasUnsavedChanges={hasUnsavedChanges} />
      </div>

      <ClimateSurveyQuestionBankPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        surveyName={name.trim() || "Pesquisa de Clima"}
        questions={previewQuestions}
      />
    </div>
  )
}
