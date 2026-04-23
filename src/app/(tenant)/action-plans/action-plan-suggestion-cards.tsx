"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Lightbulb, ChevronDown, CheckSquare, Loader2, X } from "lucide-react"
import { createActionPlanFromSuggestionAction } from "@/app/(tenant)/action-plans/new/actions"
import { dismissActionPlanSuggestionAction } from "@/app/(tenant)/action-plans/actions"
import type { ActionPlanSuggestionWithTasks } from "@/modules/action-plans/action-plan-suggestion.service"

interface Props {
  suggestions: ActionPlanSuggestionWithTasks[]
}

const PRIORITY_LABELS: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" }
const PRIORITY_CLS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border border-red-200",
  medium: "bg-amber-100 text-amber-700 border border-amber-200",
  low: "bg-muted text-muted-foreground border border-border",
}

function ActionPlanSuggestionCard({ suggestion, onDismiss }: { suggestion: ActionPlanSuggestionWithTasks; onDismiss: (id: string) => void }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [creating, startCreate] = useTransition()
  const [dismissing, startDismiss] = useTransition()
  const router = useRouter()

  function handleCreate(): void {
    startCreate(async () => {
      const result = await createActionPlanFromSuggestionAction({
        suggestionId: suggestion.id,
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority,
        tasks: suggestion.tasks.map((t) => t.title),
      })
      if (result.id !== undefined) {
        router.push(`/action-plans/${result.id}`)
      }
    })
  }

  function handleDismiss(e: React.MouseEvent): void {
    e.stopPropagation()
    startDismiss(async () => {
      await dismissActionPlanSuggestionAction(suggestion.id)
      onDismiss(suggestion.id)
    })
  }

  return (
    <div className="border border-border bg-card overflow-hidden" style={{ borderRadius: 0 }}>
      <div className="flex items-center">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v) }}
          className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors cursor-pointer group"
        >
          <span className="shrink-0 text-amber-500 mt-0.5">
            <Lightbulb className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-[12px] font-semibold text-foreground leading-snug block truncate">{suggestion.title}</span>
            <span className="text-[11px] text-muted-foreground">{suggestion.reason}</span>
          </span>
          <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${PRIORITY_CLS[suggestion.priority] ?? PRIORITY_CLS.low}`} style={{ borderRadius: 2 }}>
            {PRIORITY_LABELS[suggestion.priority] ?? suggestion.priority}
          </span>
          <ChevronDown className={`shrink-0 h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          title="Ignorar sugestão"
          className="shrink-0 p-2 mr-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {dismissing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/20">
          <p className="text-[12px] text-muted-foreground leading-relaxed">{suggestion.description}</p>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tarefas incluídas</p>
            <ul className="space-y-1.5">
              {suggestion.tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2">
                  <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[12px] text-foreground">{task.title}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors border border-primary"
            style={{ borderRadius: 0 }}
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
            {creating ? "Criando..." : "Criar este plano"}
          </button>
        </div>
      )}
    </div>
  )
}

export function ActionPlanSuggestionCards({ suggestions }: Props): React.ReactElement {
  const [visible, setVisible] = useState(suggestions.map((s) => s.id))

  function handleDismiss(id: string): void {
    setVisible((prev) => prev.filter((v) => v !== id))
  }

  const shown = suggestions.filter((s) => visible.includes(s.id))
  if (shown.length === 0) return <></>

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Sugestões com base nos dados
        </span>
      </div>
      <div className="space-y-2">
        {shown.map((s) => (
          <ActionPlanSuggestionCard key={s.id} suggestion={s} onDismiss={handleDismiss} />
        ))}
      </div>
    </div>
  )
}
