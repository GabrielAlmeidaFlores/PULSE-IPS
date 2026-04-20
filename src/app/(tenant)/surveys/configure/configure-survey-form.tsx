"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { configureSurveyAction } from "@/app/(tenant)/surveys/configure/actions"
import { PageHelp } from "@/components/page-help"
import type { ScoreDirection } from "@/modules/surveys/survey.types"

interface Department {
  id: string
  name: string
}

interface Props {
  departments: Department[]
}

interface QuestionItem {
  text: string
  order: number
  scoreDirection: ScoreDirection
}

const inputCls =
  "w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

const selectCls =
  "w-full bg-input border border-border text-foreground text-[13px] px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"

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

export function ConfigureSurveyForm({ departments }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [departmentId, setDepartmentId] = useState("")
  const [frequency, setFrequency] = useState<"daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly">("weekly")
  const [workStartTime, setWorkStartTime] = useState("09:00")
  const [workEndTime, setWorkEndTime] = useState("18:00")
  const [workDays, setWorkDays] = useState(new Set([1, 2, 3, 4, 5]))
  const [questions, setQuestions] = useState<QuestionItem[]>([
    { text: "Como você se sente em relação ao seu bem-estar no trabalho hoje?", order: 1, scoreDirection: "higher_is_better" },
    { text: "Você se sente sobrecarregado com as demandas do trabalho?", order: 2, scoreDirection: "lower_is_better" },
    { text: "Você tem recebido suporte adequado da sua liderança?", order: 3, scoreDirection: "higher_is_better" },
  ])
  const [newQuestion, setNewQuestion] = useState("")

  function toggleDay(value: number): void {
    setWorkDays((prev) => {
      const next = new Set(prev)
      if (next.has(value)) {
        if (next.size > 1) next.delete(value)
      } else {
        next.add(value)
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
    if (!departmentId) { toast.error("Selecione um departamento"); return }
    if (questions.length === 0) { toast.error("Adicione ao menos uma pergunta"); return }

    startTransition(async () => {
      const result = await configureSurveyAction({
        departmentId,
        frequency,
        workStartTime,
        workEndTime,
        workDays: Array.from(workDays).sort((a, b) => a - b),
        questions,
      })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Pesquisa configurada com sucesso")
        router.push("/surveys")
      }
    })
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
        <div className="border-b border-border px-4 py-2.5 bg-muted">
          <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Departamento</span>
        </div>
        <div className="p-4">
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className={selectCls}
            style={{ borderRadius: 0 }}
          >
            <option value="">Selecione um departamento</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
        <div className="border-b border-border px-4 py-2.5 bg-muted flex items-center gap-1.5">
          <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Configuração</span>
          <PageHelp content={
            <div className="space-y-3 text-[12px] leading-relaxed">
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Quem recebe a pesquisa?</p>
                <p className="text-foreground">Todos os funcionários <strong>ativos</strong> do departamento recebem a mensagem ao mesmo tempo, no momento do disparo. Não há filtro por turno no envio.</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Horário para responder</p>
                <p className="text-foreground">Cada funcionário recebe um link individual válido por <strong>24 horas</strong>. Ao abrir o link, o sistema verifica o horário:</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li>• Dentro do turno → pesquisa exibida normalmente</li>
                  <li>• Fora do turno → link bloqueado, pesquisa não aparece</li>
                  <li>• Após 24h → link expirado</li>
                </ul>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">De onde vem o horário de cada um?</p>
                <p className="text-foreground">O sistema usa o horário cadastrado no <strong>perfil do funcionário</strong>. Se ele não tiver horário próprio, herda automaticamente o <strong>início/fim do expediente definido aqui</strong>.</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Dias e frequência</p>
                <p className="text-foreground">Nos dias não marcados, o disparo não ocorre. O próximo envio é agendado automaticamente contando os dias desde o último disparo: diário=1d · 2×/sem=3d · semanal=7d · quinzenal=14d · mensal=28d.</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Atenção</p>
                <p className="text-muted-foreground">Departamentos sem funcionários ativos são ignorados. É necessário ter ao menos uma configuração de pesquisa criada para que os disparos aconteçam.</p>
              </div>
            </div>
          } />
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Frequência de envio</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className={selectCls}
              style={{ borderRadius: 0 }}
            >
              <option value="daily">Diária</option>
              <option value="twice_weekly">2x por semana</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Dias de envio</label>
            <div className="flex gap-1.5 flex-wrap">
              {WEEK_DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                    workDays.has(d.value)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
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
            Funcionários com horário personalizado usam seu próprio horário; os demais herdam o horário acima.
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
                <p className="text-foreground">Cada pergunta usa uma escala de <strong>1 a 5</strong>. O funcionário escolhe a nota que melhor representa sua percepção.</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Direção da escala</p>
                <p className="text-foreground">
                  Perguntas podem ter sentidos opostos — por isso você define a direção de cada uma:
                </p>
                <ul className="mt-2 space-y-2 text-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 font-bold text-green-600">1→5 bom</span>
                    <span className="text-muted-foreground">Nota alta é positiva. Ex: <em>&ldquo;Qual seu nível de entusiasmo?&rdquo;</em> — 5 = muito entusiasmado (bom)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 font-bold text-red-500 whitespace-nowrap">1→5 ruim</span>
                    <span className="text-muted-foreground">Nota alta é negativa. Ex: <em>&ldquo;Qual seu nível de estresse?&rdquo;</em> — 5 = muito estressado (ruim)</span>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-bold uppercase tracking-widest text-[10px] text-primary mb-1">Como o sistema usa isso</p>
                <p className="text-muted-foreground">
                  O sistema normaliza automaticamente as notas. Independente da direção, scores altos nos gráficos sempre significam situação positiva — facilitando a comparação entre perguntas.
                </p>
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
                  className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
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
                      ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400"
                      : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
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
          {isPending ? "Salvando..." : "Salvar configuração"}
        </button>
        <Link
          href="/surveys"
          className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          style={{ borderRadius: 0 }}
        >
          Cancelar
        </Link>
      </div>
    </div>
  )
}
