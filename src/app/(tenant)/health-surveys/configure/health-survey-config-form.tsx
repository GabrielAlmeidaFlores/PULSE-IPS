"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { PageHelp } from "@/components/page-help"
import { NativeSelect } from "@/components/ui/native-select"
import type { ScoreDirection } from "@/modules/health-surveys/health-survey.types"
import type { HealthSurveyConfigWithDetails } from "@/modules/health-surveys/health-survey-config.service"

interface DepartmentOption {
  id: string
  name: string
}

type FormMode = "create" | "edit"

interface HealthSurveyConfigFormProps {
  mode: FormMode
  departments?: DepartmentOption[]
  initialConfig?: HealthSurveyConfigWithDetails | null
  onSubmit: (data: HealthSurveyConfigFormData) => Promise<{ error?: string } | undefined>
  cancelHref: string
}

export interface HealthSurveyConfigFormData {
  name: string
  description: string
  departmentIds: string[] | "all"
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly"
  scheduledDayOfMonth: number | null
  workStartTime: string
  workEndTime: string
  workDays: number[]
  questions: { text: string; order: number; scoreDirection: ScoreDirection }[]
}

interface QuestionItem {
  text: string
  order: number
  scoreDirection: ScoreDirection
}

const DEFAULT_QUESTIONS: QuestionItem[] = [
  { text: "Como você se sente em relação ao seu bem-estar no trabalho hoje?", order: 1, scoreDirection: "higher_is_better" },
  { text: "Você se sente sobrecarregado com as demandas do trabalho?", order: 2, scoreDirection: "lower_is_better" },
  { text: "Você tem recebido suporte adequado da sua liderança?", order: 3, scoreDirection: "higher_is_better" },
]

const inputCls =
  "w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

const WEEK_DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
]

const DIRECTION_LABELS: Record<ScoreDirection, string> = {
  higher_is_better: "1 = ruim · 5 = bom",
  lower_is_better: "1 = bom · 5 = ruim",
}

const MAX_DAYS_BY_FREQUENCY: Record<string, number> = {
  daily: 7,
  twice_weekly: 2,
  weekly: 1,
  biweekly: 1,
  monthly: 7,
}

const FREQUENCY_DAY_HINT: Record<string, string | null> = {
  daily: null,
  twice_weekly: "Selecione exatamente 2 dias",
  weekly: "Selecione exatamente 1 dia",
  biweekly: "Selecione exatamente 1 dia",
  monthly: null,
}

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1)

function buildDepartmentIds(mode: FormMode, allDepts: boolean, selectedDeptIds: Set<string>): string[] | "all" {
  if (mode !== "create") return "all"
  if (allDepts) return "all"
  return Array.from(selectedDeptIds)
}

function submitLabel(mode: FormMode): string {
  if (mode === "create") return "Criar pesquisa"
  return "Salvar alterações"
}

export function HealthSurveyConfigForm({ mode, departments, initialConfig, onSubmit, cancelHref }: HealthSurveyConfigFormProps): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(initialConfig?.name ?? "Pesquisa de Saúde")
  const [description, setDescription] = useState(initialConfig?.description ?? "")
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<string>>(new Set())
  const [allDepts, setAllDepts] = useState(false)
  const [frequency, setFrequency] = useState<"daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly">(
    (initialConfig?.frequency as "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly") ?? "weekly",
  )
  const [scheduledDayOfMonth, setScheduledDayOfMonth] = useState<number | null>(initialConfig?.scheduledDayOfMonth ?? null)
  const [workStartTime, setWorkStartTime] = useState(initialConfig?.workStartTime ?? "09:00")
  const [workEndTime, setWorkEndTime] = useState(initialConfig?.workEndTime ?? "18:00")
  const [workDays, setWorkDays] = useState(
    new Set(initialConfig?.workDays.map((w) => w.dayOfWeek) ?? [1, 2, 3, 4, 5]),
  )
  const [questions, setQuestions] = useState<QuestionItem[]>(
    initialConfig?.questions.map((q) => ({ text: q.text, order: q.order, scoreDirection: q.scoreDirection as ScoreDirection })) ?? DEFAULT_QUESTIONS,
  )
  const [newQuestion, setNewQuestion] = useState("")

  function toggleDay(value: number): void {
    setWorkDays((prev) => {
      const next = new Set(prev)
      const maxDays = MAX_DAYS_BY_FREQUENCY[frequency] ?? 7
      if (next.has(value)) {
        if (next.size > 1) next.delete(value)
      } else {
        if (next.size < maxDays) {
          next.add(value)
        } else if (maxDays === 1) {
          next.clear()
          next.add(value)
        }
      }
      return next
    })
  }

  function toggleDept(deptId: string): void {
    setSelectedDeptIds((prev) => {
      const next = new Set(prev)
      if (next.has(deptId)) {
        next.delete(deptId)
      } else {
        next.add(deptId)
      }
      return next
    })
  }

  function toggleAllDepts(): void {
    setAllDepts((prev) => {
      const next = !prev
      if (next) {
        setSelectedDeptIds(new Set())
      }
      return next
    })
  }

  function addQuestion(): void {
    if (!newQuestion.trim()) return
    setQuestions((prev) => [...prev, { text: newQuestion.trim(), order: prev.length + 1, scoreDirection: "higher_is_better" }])
    setNewQuestion("")
  }

  function removeQuestion(index: number): void {
    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, order: i + 1 }))
    )
  }

  function toggleDirection(index: number): void {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, scoreDirection: q.scoreDirection === "higher_is_better" ? "lower_is_better" : "higher_is_better" }
          : q,
      ),
    )
  }

  function handleSubmit(): void {
    if (!name.trim()) { toast.error("Informe o nome da pesquisa"); return }
    if (mode === "create" && !allDepts && selectedDeptIds.size === 0) { toast.error("Selecione ao menos um setor"); return }
    if (frequency === "monthly" && scheduledDayOfMonth === null) { toast.error("Selecione o dia do mês para o envio mensal"); return }
    const maxDays = MAX_DAYS_BY_FREQUENCY[frequency] ?? 7
    if (frequency !== "monthly" && workDays.size !== maxDays && maxDays < 7) {
      toast.error(`Selecione exatamente ${maxDays} ${maxDays === 1 ? "dia" : "dias"} para a frequência escolhida.`)
      return
    }
    if (questions.length === 0) { toast.error("Adicione ao menos uma pergunta"); return }

    const departmentIds: string[] | "all" = buildDepartmentIds(mode, allDepts, selectedDeptIds)

    startTransition(async () => {
      const result = await onSubmit({
        name: name.trim(),
        description: description.trim(),
        departmentIds,
        frequency,
        scheduledDayOfMonth: frequency === "monthly" ? scheduledDayOfMonth : null,
        workStartTime,
        workEndTime,
        workDays: Array.from(workDays).sort((a, b) => a - b),
        questions,
      })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(mode === "create" ? "Pesquisa criada com sucesso" : "Pesquisa atualizada com sucesso")
        router.push("/health-surveys/configure")
      }
    })
  }

  return (
    <div className="max-w-xl space-y-4">
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
              rows={2}
              className={`${inputCls} resize-none`}
              style={{ borderRadius: 0 }}
            />
          </div>
        </div>
      </div>

      {mode === "create" && departments !== undefined && (
        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <div className="border-b border-border px-4 py-2.5 bg-muted">
            <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Setores</span>
          </div>
          <div className="p-4 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allDepts}
                onChange={toggleAllDepts}
                className="accent-primary"
              />
              <span className="text-[12px] font-semibold text-foreground">Todos os setores</span>
            </label>
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

      {mode === "edit" && initialConfig !== undefined && initialConfig !== null && (
        <div className="border border-border bg-muted/30 px-4 py-2.5" style={{ borderRadius: 0 }}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Setor: </span>
          <span className="text-[12px] text-foreground">{initialConfig.department.name}</span>
        </div>
      )}

      <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
        <div className="border-b border-border px-4 py-2.5 bg-muted flex items-center gap-1.5">
          <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Configuração de envio</span>
          <PageHelp content={
            <div className="space-y-3 text-[12px] leading-relaxed">
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Frequência semanal</p>
                <p className="text-foreground">Para frequências semanais, selecione os dias da semana em que a pesquisa será enviada. O sistema verifica a cada 15 minutos se está dentro da janela de envio.</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Frequência mensal</p>
                <p className="text-foreground">Para frequência mensal, escolha o dia do mês (1–28). A pesquisa será enviada uma vez por mês neste dia, dentro do horário definido.</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Horário de resposta</p>
                <p className="text-foreground">Cada colaborador recebe um link individual válido por <strong>48 horas</strong>. O link só permite resposta dentro do horário de expediente definido.</p>
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
                  const trimmed = Array.from(prev).slice(0, maxDays)
                  return new Set(trimmed)
                })
              }}
            >
              <option value="daily">Diária</option>
              <option value="twice_weekly">2× por semana</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
              <option value="monthly">Mensal</option>
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
                    className={`w-8 h-8 text-[11px] font-bold border transition-colors ${
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
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Meses sem esse dia (ex: fevereiro para dias acima de 28) serão pulados automaticamente.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dias de envio</label>
                {FREQUENCY_DAY_HINT[frequency] !== null && (
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Início do expediente</label>
              <input
                type="time"
                value={workStartTime}
                onChange={(e) => setWorkStartTime(e.target.value)}
                className={inputCls}
                style={{ borderRadius: 0 }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Fim do expediente</label>
              <input
                type="time"
                value={workEndTime}
                onChange={(e) => setWorkEndTime(e.target.value)}
                className={inputCls}
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Colaboradores com horário personalizado usam seu próprio horário; os demais herdam o horário acima.
          </p>
        </div>
      </div>

      <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
        <div className="border-b border-border px-4 py-2.5 bg-muted flex items-center gap-1.5">
          <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Perguntas ({questions.length})</span>
          <PageHelp content={
            <div className="space-y-3 text-[12px] leading-relaxed">
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Escala de resposta</p>
                <p className="text-foreground">Cada pergunta usa uma escala de <strong>1 a 5</strong>. O colaborador escolhe a nota que melhor representa sua percepção.</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Direção da escala</p>
                <ul className="mt-2 space-y-2 text-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 font-bold text-status-success">1→5 bom</span>
                    <span className="text-muted-foreground">Nota alta é positiva. Ex: <em>&ldquo;Qual seu nível de entusiasmo?&rdquo;</em></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 font-bold text-status-danger whitespace-nowrap">1→5 ruim</span>
                    <span className="text-muted-foreground">Nota alta é negativa. Ex: <em>&ldquo;Qual seu nível de estresse?&rdquo;</em></span>
                  </li>
                </ul>
              </div>
            </div>
          } />
        </div>
        <div className="divide-y divide-border">
          {questions.map((q, i) => (
            <div key={q.order} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-mono font-bold text-muted-foreground mt-1 shrink-0 w-4">{q.order}.</span>
                <span className="flex-1 text-[13px] text-foreground">{q.text}</span>
                <button
                  onClick={() => removeQuestion(i)}
                  className="shrink-0 p-1 text-muted-foreground hover:text-status-danger transition-colors"
                  style={{ borderRadius: 0 }}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 pl-7">
                <HelpCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground">Direção da escala:</span>
                <button
                  type="button"
                  onClick={() => toggleDirection(i)}
                  className={`px-2 py-0.5 text-[10px] font-bold border transition-colors ${
                    q.scoreDirection === "higher_is_better"
                      ? "border-status-success-border bg-status-success-subtle text-status-success"
                      : "border-status-danger-border bg-status-danger-subtle text-status-danger"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {DIRECTION_LABELS[q.scoreDirection]}
                </button>
              </div>
            </div>
          ))}
          <div className="px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addQuestion())}
                placeholder="Nova pergunta..."
                className={`${inputCls} flex-1`}
                style={{ borderRadius: 0 }}
              />
              <button
                onClick={addQuestion}
                disabled={!newQuestion.trim()}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ borderRadius: 0 }}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Nova pergunta será adicionada com <strong>1 = ruim · 5 = bom</strong>. Você pode alterar a direção após adicionar.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ borderRadius: 0 }}
          type="button"
        >
          {isPending ? "Salvando..." : submitLabel(mode)}
        </button>
        <Link
          href={cancelHref}
          className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          style={{ borderRadius: 0 }}
        >
          Cancelar
        </Link>
      </div>
    </div>
  )
}
