"use client"

import { useState, useTransition } from "react"
import { AlertTriangle, Pencil } from "lucide-react"
import { toast } from "sonner"
import { NativeSelect } from "@/components/ui/native-select"
import { updateClimateSurveyActionPlanStatusAction } from "@/app/(tenant)/climate-surveys/action-plans/actions"
import { ClimateSurveyActionPlanFormModal } from "@/app/(tenant)/climate-surveys/action-plans/climate-survey-action-plan-form-modal"
import type {
  ClimateSurveyActionPlanAssigneeOption,
  ClimateSurveyActionPlanRow,
  ClimateSurveyBelowGoalTopic,
} from "@/modules/climate-surveys/climate-survey-action-plan.service"
import type { ClimateSurveyDimension, ClimateSurveyTopicOption } from "@/modules/climate-surveys/climate-survey.types"
import { BADGE_AMBER, BADGE_BASE, BADGE_DEFAULT, BADGE_RED } from "@/libs/design-system/alert-labels"

const PRIORITY_STYLE: Record<string, string> = {
  low: BADGE_DEFAULT,
  medium: BADGE_AMBER,
  high: BADGE_RED,
}

const TOPIC_STATUS_STYLE: Record<string, string> = {
  attention: "border-status-warning-border bg-status-warning-subtle text-status-warning",
  critical: "border-status-danger-border bg-status-danger-subtle text-status-danger",
  above_goal: "border-status-success-border bg-status-success-subtle text-status-success",
  unavailable: "border-border bg-muted text-muted-foreground",
}

interface ClimateSurveyActionPlanBoardClientProps {
  belowGoalTopics: ClimateSurveyBelowGoalTopic[]
  actions: ClimateSurveyActionPlanRow[]
  assignees: ClimateSurveyActionPlanAssigneeOption[]
  topics: ClimateSurveyTopicOption[]
  waveId: string | null
  corporateGoalPercent: number
}

function formatDueDate(date: Date | string | null): string {
  if (date === null) return "—"
  const parsed = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(parsed.getTime())) return "—"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parsed)
}

export function ClimateSurveyActionPlanBoardClient({
  belowGoalTopics,
  actions,
  assignees,
  topics,
  waveId,
  corporateGoalPercent,
}: ClimateSurveyActionPlanBoardClientProps): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [createDimension, setCreateDimension] = useState<ClimateSurveyDimension | null>(null)
  const [editingAction, setEditingAction] = useState<ClimateSurveyActionPlanRow | null>(null)

  function openCreate(dimension?: ClimateSurveyDimension): void {
    setCreateDimension(dimension ?? null)
    setCreateOpen(true)
  }

  function handleStatusChange(planId: string, status: string): void {
    startTransition(async () => {
      const result = await updateClimateSurveyActionPlanStatusAction(planId, status)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      toast.success("Status atualizado.")
    })
  }

  return (
    <div className="space-y-4">
      <div className="border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tópicos abaixo da meta ({corporateGoalPercent}%)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exibidos automaticamente a partir da última onda com dados suficientes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { openCreate() }}
            className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            style={{ borderRadius: 0 }}
          >
            Nova ação
          </button>
        </div>
        {belowGoalTopics.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhum tópico abaixo da meta</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quando um tópico ficar abaixo de {corporateGoalPercent}%, ele aparece aqui para virar ação.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {belowGoalTopics.map((topic) => (
              <div
                key={topic.dimension}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{topic.label}</p>
                    <span
                      className={`${BADGE_BASE} ${TOPIC_STATUS_STYLE[topic.status] ?? BADGE_DEFAULT}`}
                    >
                      {topic.scorePercent ?? "—"}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Meta {topic.goalPercent}% · {topic.openActionsCount}{" "}
                    {topic.openActionsCount === 1 ? "ação aberta" : "ações abertas"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { openCreate(topic.dimension) }}
                  className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Criar ação
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Ações ({actions.length})
          </p>
        </div>
        {actions.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhuma ação cadastrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crie uma ação para um tópico abaixo da meta ou pelo botão Nova ação.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {actions.map((action) => (
              <div key={action.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                <span className={`${BADGE_BASE} ${PRIORITY_STYLE[action.priority] ?? BADGE_DEFAULT} shrink-0`}>
                  {action.priorityLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{action.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {action.dimensionLabel ?? "Sem tópico vinculado"}
                  </p>
                  {action.description !== null && action.description.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{action.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                    <span>{action.assigneeName ?? "Sem responsável"}</span>
                    <span
                      className={
                        action.isOverdue
                          ? "inline-flex items-center gap-1 text-status-danger font-bold"
                          : "inline-flex items-center gap-1"
                      }
                    >
                      {action.isOverdue && <AlertTriangle size={12} />}
                      {formatDueDate(action.dueDate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <NativeSelect
                    containerClassName="w-auto min-w-[150px]"
                    value={action.status}
                    disabled={isPending}
                    onChange={(event) => { handleStatusChange(action.id, event.target.value) }}
                  >
                    <option value="open">Planejado</option>
                    <option value="in_progress">Em andamento</option>
                    <option value="completed">Concluído</option>
                  </NativeSelect>
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => { setEditingAction(action) }}
                    style={{ borderRadius: 0 }}
                    className="flex items-center gap-1 px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClimateSurveyActionPlanFormModal
        key={`create-${createDimension ?? "none"}-${createOpen ? "open" : "closed"}`}
        open={createOpen}
        onClose={() => { setCreateOpen(false) }}
        mode="create"
        assignees={assignees}
        topics={topics}
        waveId={waveId}
        initialDimension={createDimension}
      />

      <ClimateSurveyActionPlanFormModal
        key={`edit-${editingAction?.id ?? "none"}`}
        open={editingAction !== null}
        onClose={() => { setEditingAction(null) }}
        mode="edit"
        assignees={assignees}
        topics={topics}
        waveId={waveId}
        initialAction={editingAction}
      />
    </div>
  )
}
