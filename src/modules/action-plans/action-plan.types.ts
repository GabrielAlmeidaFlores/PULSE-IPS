export interface ActionPlan {
  id: string
  tenantId: string
  title: string
  description: string | null
  status: "open" | "in_progress" | "completed"
  priority: "low" | "medium" | "high"
  dueDate: Date | null
  completedAt: Date | null
  assigneeId: string | null
  climateSurveyDispatchId: string | null
  climateSurveyDimension: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ActionPlanTask {
  id: string
  actionPlanId: string
  title: string
  assigneeId: string | null
  dueDate: Date | null
  completedAt: Date | null
  createdAt: Date
}

export interface CreateActionPlanInput {
  title: string
  description?: string | undefined
  priority?: "low" | "medium" | "high" | undefined
  dueDate?: Date | undefined
  alertId?: string | undefined
  reportId?: string | undefined
  climateSurveyDispatchId?: string | undefined
  climateSurveyDimension?: string | undefined
  assigneeId?: string | undefined
  status?: "open" | "in_progress" | "completed" | undefined
}

export interface CreateActionPlanTaskInput {
  title: string
  assigneeId?: string | undefined
  dueDate?: Date | undefined
}

export interface UpdateActionPlanInput {
  title?: string | undefined
  description?: string | null | undefined
  status?: "open" | "in_progress" | "completed" | "cancelled" | undefined
  priority?: "low" | "medium" | "high" | undefined
  dueDate?: Date | null | undefined
  completedAt?: Date | null | undefined
  assigneeId?: string | null | undefined
  climateSurveyDimension?: string | null | undefined
  climateSurveyDispatchId?: string | null | undefined
}

export const ACTION_PLAN_STATUS_LABELS: Record<"open" | "in_progress" | "completed", string> = {
  open: "Planejado",
  in_progress: "Em andamento",
  completed: "Concluído",
}

export const ACTION_PLAN_PRIORITY_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
}
