"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { NativeSelect } from "@/components/ui/native-select"
import {
  createClimateSurveyActionPlanItemAction,
  updateClimateSurveyActionPlanItemAction,
} from "@/app/(tenant)/climate-surveys/action-plans/actions"
import {
  CLIMATE_SURVEY_DIMENSION_LABELS,
  CLIMATE_SURVEY_DIMENSION_ORDER,
  type ClimateSurveyDimension,
} from "@/modules/climate-surveys/climate-survey.types"
import type { ClimateSurveyActionPlanAssigneeOption, ClimateSurveyActionPlanRow } from "@/modules/climate-surveys/climate-survey-action-plan.service"

interface ClimateSurveyActionPlanFormModalProps {
  open: boolean
  onClose: () => void
  mode: "create" | "edit"
  assignees: ClimateSurveyActionPlanAssigneeOption[]
  waveId: string | null
  initialDimension?: ClimateSurveyDimension | null
  initialAction?: ClimateSurveyActionPlanRow | null
}

interface FormState {
  title: string
  description: string
  priority: "low" | "medium" | "high"
  status: "open" | "in_progress" | "completed"
  dueDate: string
  assigneeId: string
  dimension: string
}

const INPUT_CLASS =
  "w-full bg-input border border-input-border text-foreground text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
const LABEL_CLASS = "text-[10px] font-bold tracking-widest uppercase text-muted-foreground"

function toDateInputValue(date: Date | string | null): string {
  if (date === null) return ""
  const parsed = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toISOString().slice(0, 10)
}

function buildInitialState(
  mode: "create" | "edit",
  initialDimension: ClimateSurveyDimension | null | undefined,
  initialAction: ClimateSurveyActionPlanRow | null | undefined,
): FormState {
  if (mode === "edit" && initialAction !== null && initialAction !== undefined) {
    return {
      title: initialAction.title,
      description: initialAction.description ?? "",
      priority: initialAction.priority,
      status: initialAction.status,
      dueDate: toDateInputValue(initialAction.dueDate),
      assigneeId: initialAction.assigneeId ?? "",
      dimension: initialAction.dimension ?? "",
    }
  }
  return {
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    dueDate: "",
    assigneeId: "",
    dimension: initialDimension ?? "",
  }
}

function submitButtonLabel(isPending: boolean, mode: "create" | "edit"): string {
  if (isPending) return "Salvando..."
  if (mode === "create") return "Criar ação"
  return "Salvar"
}

export function ClimateSurveyActionPlanFormModal({
  open,
  onClose,
  mode,
  assignees,
  waveId,
  initialDimension = null,
  initialAction = null,
}: ClimateSurveyActionPlanFormModalProps): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>(() => buildInitialState(mode, initialDimension, initialAction))

  function handleSubmit(): void {
    if (form.title.trim().length === 0) {
      toast.error("Informe o título.")
      return
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createClimateSurveyActionPlanItemAction({
          title: form.title.trim(),
          priority: form.priority,
          status: form.status,
          ...(form.description.trim().length > 0 ? { description: form.description.trim() } : {}),
          ...(form.dueDate.length > 0 ? { dueDate: form.dueDate } : {}),
          ...(form.assigneeId.length > 0 ? { assigneeId: form.assigneeId } : {}),
          ...(form.dimension.length > 0
            ? { dimension: form.dimension as ClimateSurveyDimension }
            : {}),
          ...(waveId !== null ? { climateSurveyDispatchId: waveId } : {}),
        })
        if (result.error !== undefined) {
          toast.error(result.error)
          return
        }
        toast.success("Ação criada.")
        onClose()
        return
      }

      if (initialAction === null || initialAction === undefined) {
        toast.error("Ação inválida.")
        return
      }

      const result = await updateClimateSurveyActionPlanItemAction({
        planId: initialAction.id,
        title: form.title.trim(),
        description: form.description.trim().length > 0 ? form.description.trim() : null,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate.length > 0 ? form.dueDate : null,
        assigneeId: form.assigneeId.length > 0 ? form.assigneeId : null,
        dimension: form.dimension.length > 0 ? (form.dimension as ClimateSurveyDimension) : null,
      })
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      toast.success("Ação atualizada.")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest">
            {mode === "create" ? "Nova ação" : "Editar ação"}
          </DialogTitle>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Título</label>
              <input
                className={INPUT_CLASS}
                style={{ borderRadius: 0 }}
                value={form.title}
                onChange={(event) => { setForm((prev) => ({ ...prev, title: event.target.value })) }}
                placeholder="Ex.: Melhorar feedback da liderança"
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Descrição</label>
              <textarea
                className={INPUT_CLASS}
                style={{ borderRadius: 0 }}
                rows={3}
                value={form.description}
                onChange={(event) => { setForm((prev) => ({ ...prev, description: event.target.value })) }}
                placeholder="Detalhe o que será feito"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Responsável</label>
                <NativeSelect
                  value={form.assigneeId}
                  onChange={(event) => { setForm((prev) => ({ ...prev, assigneeId: event.target.value })) }}
                >
                  <option value="">Sem responsável</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Tópico</label>
                <NativeSelect
                  value={form.dimension}
                  onChange={(event) => { setForm((prev) => ({ ...prev, dimension: event.target.value })) }}
                >
                  <option value="">Sem tópico</option>
                  {CLIMATE_SURVEY_DIMENSION_ORDER.map((dimension) => (
                    <option key={dimension} value={dimension}>
                      {CLIMATE_SURVEY_DIMENSION_LABELS[dimension]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Prioridade</label>
                <NativeSelect
                  value={form.priority}
                  onChange={(event) => {
                    setForm((prev) => ({
                      ...prev,
                      priority: event.target.value as FormState["priority"],
                    }))
                  }}
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Status</label>
                <NativeSelect
                  value={form.status}
                  onChange={(event) => {
                    setForm((prev) => ({
                      ...prev,
                      status: event.target.value as FormState["status"],
                    }))
                  }}
                >
                  <option value="open">Planejado</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="completed">Concluído</option>
                </NativeSelect>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={LABEL_CLASS}>Prazo</label>
                <input
                  type="date"
                  className={INPUT_CLASS}
                  style={{ borderRadius: 0 }}
                  value={form.dueDate}
                  onChange={(event) => { setForm((prev) => ({ ...prev, dueDate: event.target.value })) }}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <DialogClose
              style={{ borderRadius: 0 }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </DialogClose>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmit}
              style={{ borderRadius: 0 }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitButtonLabel(isPending, mode)}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
