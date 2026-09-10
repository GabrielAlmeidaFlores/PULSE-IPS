import {
  countClimateSurveyActionPlanIndicators,
  createActionPlan,
  findActionPlanById,
  findClimateSurveyActionPlans,
  updateActionPlan,
  type ActionPlanWithAssignee,
} from "@/modules/action-plans/action-plan.repository"
import {
  ACTION_PLAN_PRIORITY_LABELS,
  ACTION_PLAN_STATUS_LABELS,
  type ActionPlan,
  type CreateActionPlanInput,
  type UpdateActionPlanInput,
} from "@/modules/action-plans/action-plan.types"
import { createAuditLog } from "@/modules/audit/audit.repository"
import { getOrgUsers } from "@/modules/auth/invite.service"
import { getClimateSurveyModuleDashboard } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import {
  CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
  climateSurveyMetricStatus,
  resolveClimateSurveyTopicLabel,
  toClimateSurveyDimension,
  type ClimateSurveyDimension,
  type ClimateSurveyMetricStatus,
  type ClimateSurveyTopicOption,
} from "@/modules/climate-surveys/climate-survey.types"
import { listClimateSurveyTopicOptions } from "@/modules/climate-surveys/climate-survey-topic.service"
import { AppError } from "@/libs/errors/app-error"
import { findLatestActiveClimateSurveyDispatch } from "@/modules/climate-surveys/climate-survey.repository"
import {
  recordClimateSurveyActionCompleted,
  recordClimateSurveyActionCreated,
} from "@/modules/climate-surveys/climate-survey-analytics.service"

export interface ClimateSurveyBelowGoalTopic {
  dimension: ClimateSurveyDimension
  label: string
  scorePercent: number | null
  goalPercent: number
  status: ClimateSurveyMetricStatus
  openActionsCount: number
}

export interface ClimateSurveyActionPlanRow {
  id: string
  title: string
  description: string | null
  status: ActionPlan["status"]
  statusLabel: string
  priority: ActionPlan["priority"]
  priorityLabel: string
  dueDate: Date | null
  isOverdue: boolean
  assigneeId: string | null
  assigneeName: string | null
  dimension: ClimateSurveyDimension | null
  dimensionLabel: string | null
  dispatchId: string | null
  dispatchConfigName: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ClimateSurveyActionPlanIndicators {
  completed: number
  inProgress: number
  overdue: number
}

export interface ClimateSurveyActionPlanAssigneeOption {
  id: string
  name: string
}

export interface ClimateSurveyActionPlanBoard {
  wave: {
    id: string
    configName: string
    scheduledAt: Date
  } | null
  belowGoalTopics: ClimateSurveyBelowGoalTopic[]
  actions: ClimateSurveyActionPlanRow[]
  indicators: ClimateSurveyActionPlanIndicators
  assignees: ClimateSurveyActionPlanAssigneeOption[]
  topics: ClimateSurveyTopicOption[]
  corporateGoalPercent: number
}

export interface ClimateSurveyActionPlanBoardFilters {
  status?: string
  assigneeId?: string
  dimension?: string
}

export interface CreateClimateSurveyActionPlanInput {
  title: string
  description?: string | undefined
  priority: ActionPlan["priority"]
  status?: ActionPlan["status"] | undefined
  dueDate?: Date | undefined
  assigneeId?: string | undefined
  dimension?: ClimateSurveyDimension | undefined
  climateSurveyDispatchId?: string | undefined
}

export interface UpdateClimateSurveyActionPlanInput {
  title?: string | undefined
  description?: string | null | undefined
  priority?: ActionPlan["priority"] | undefined
  status?: ActionPlan["status"] | undefined
  dueDate?: Date | null | undefined
  assigneeId?: string | null | undefined
  dimension?: ClimateSurveyDimension | null | undefined
}

function isActionPlanStatus(value: string): value is ActionPlan["status"] {
  return value === "open" || value === "in_progress" || value === "completed"
}

function isActionPlanPriority(value: string): value is ActionPlan["priority"] {
  return value === "low" || value === "medium" || value === "high"
}

function mapActionRow(
  plan: ActionPlanWithAssignee,
  now: Date,
  topicLabelMap: ReadonlyMap<string, string>,
): ClimateSurveyActionPlanRow {
  const status = isActionPlanStatus(plan.status) ? plan.status : "open"
  const priority = isActionPlanPriority(plan.priority) ? plan.priority : "medium"
  const dimension =
    plan.climateSurveyDimension !== null ? toClimateSurveyDimension(plan.climateSurveyDimension) : null
  const isOverdue =
    plan.dueDate !== null && plan.dueDate.getTime() < now.getTime() && status !== "completed"

  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    status,
    statusLabel: ACTION_PLAN_STATUS_LABELS[status],
    priority,
    priorityLabel: ACTION_PLAN_PRIORITY_LABELS[priority],
    dueDate: plan.dueDate,
    isOverdue,
    assigneeId: plan.assigneeId,
    assigneeName: plan.assignee?.name ?? null,
    dimension,
    dimensionLabel: dimension !== null ? resolveClimateSurveyTopicLabel(dimension, topicLabelMap) : null,
    dispatchId: plan.climateSurveyDispatchId,
    dispatchConfigName: plan.climateSurveyDispatch?.climateSurveyConfiguration.name ?? null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }
}

async function assertActiveAssignee(tenantId: string, assigneeId: string): Promise<void> {
  const users = await getOrgUsers(tenantId)
  const found = users.find((user) => user.id === assigneeId && user.isActive)
  if (!found) {
    throw new AppError("ASSIGNEE_NOT_FOUND", "Responsável não encontrado.")
  }
}

async function resolveDefaultClimateSurveyDispatchId(tenantId: string): Promise<string | null> {
  const latest = await findLatestActiveClimateSurveyDispatch(tenantId)
  return latest?.id ?? null
}

export async function getClimateSurveyActionPlanBoard(
  tenantId: string,
  filters: ClimateSurveyActionPlanBoardFilters = {},
): Promise<ClimateSurveyActionPlanBoard> {
  const [dashboard, plans, indicators, users, topics] = await Promise.all([
    getClimateSurveyModuleDashboard(tenantId),
    findClimateSurveyActionPlans(tenantId, {}),
    countClimateSurveyActionPlanIndicators(tenantId),
    getOrgUsers(tenantId),
    listClimateSurveyTopicOptions(tenantId),
  ])

  const now = new Date()
  const topicLabelMap = new Map(topics.map((topic) => [topic.key, topic.label]))
  const allRows = plans.map((plan) => mapActionRow(plan, now, topicLabelMap))
  const openCountByDimension = new Map<ClimateSurveyDimension, number>()
  for (const action of allRows) {
    if (action.dimension === null || action.status === "completed") continue
    openCountByDimension.set(action.dimension, (openCountByDimension.get(action.dimension) ?? 0) + 1)
  }

  const actions = allRows.filter((action) => {
    if (filters.status !== undefined && action.status !== filters.status) return false
    if (filters.assigneeId !== undefined && action.assigneeId !== filters.assigneeId) return false
    if (filters.dimension !== undefined && action.dimension !== filters.dimension) return false
    return true
  })

  const belowGoalTopics: ClimateSurveyBelowGoalTopic[] = dashboard.radar
    .filter((point) => point.scorePercent !== null && point.scorePercent < point.goalPercent)
    .map((point) => ({
      dimension: point.dimension,
      label: point.label,
      scorePercent: point.scorePercent,
      goalPercent: point.goalPercent,
      status: climateSurveyMetricStatus(point.scorePercent, point.goalPercent),
      openActionsCount: openCountByDimension.get(point.dimension) ?? 0,
    }))

  return {
    wave: dashboard.wave
      ? {
          id: dashboard.wave.id,
          configName: dashboard.wave.configName,
          scheduledAt: dashboard.wave.scheduledAt,
        }
      : null,
    belowGoalTopics,
    actions,
    indicators,
    assignees: users
      .filter((user) => user.isActive)
      .map((user) => ({ id: user.id, name: user.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    topics,
    corporateGoalPercent: CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
  }
}

export async function createClimateSurveyActionPlan(
  tenantId: string,
  input: CreateClimateSurveyActionPlanInput,
  actorId?: string,
): Promise<ActionPlan> {
  if (input.assigneeId !== undefined) {
    await assertActiveAssignee(tenantId, input.assigneeId)
  }

  const dispatchId = input.climateSurveyDispatchId ?? (await resolveDefaultClimateSurveyDispatchId(tenantId))
  if (dispatchId === null) {
    throw new AppError(
      "CLIMATE_SURVEY_DISPATCH_REQUIRED",
      "Não há onda de clima disponível para vincular a ação. Dispare uma pesquisa primeiro.",
    )
  }

  const createInput: CreateActionPlanInput = {
    title: input.title,
    priority: input.priority,
    climateSurveyDispatchId: dispatchId,
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
    ...(input.dimension !== undefined ? { climateSurveyDimension: input.dimension } : {}),
  }

  const plan = await createActionPlan(tenantId, createInput)
  await createAuditLog({
    tenantId,
    ...(actorId !== undefined ? { userId: actorId } : {}),
    action: "action_plan.created",
    resource: "action_plans",
    resourceId: plan.id,
    metadata: { title: plan.title, source: "climate_survey" },
  })
  await recordClimateSurveyActionCreated(tenantId, plan.id, dispatchId)
  return plan
}

export async function updateClimateSurveyActionPlan(
  tenantId: string,
  planId: string,
  input: UpdateClimateSurveyActionPlanInput,
  actorId?: string,
): Promise<void> {
  const existing = await findActionPlanById(tenantId, planId)
  if (existing === null) {
    throw new AppError("ACTION_PLAN_NOT_FOUND", "Ação de clima não encontrada.")
  }
  if (existing.climateSurveyDispatchId === null) {
    throw new AppError("ACTION_PLAN_NOT_FOUND", "Ação de clima não encontrada.")
  }
  const climateDispatchId = existing.climateSurveyDispatchId
  const previousStatus = existing.status

  if (input.assigneeId !== undefined && input.assigneeId !== null) {
    await assertActiveAssignee(tenantId, input.assigneeId)
  }

  const data: UpdateActionPlanInput = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
    ...(input.dimension !== undefined ? { climateSurveyDimension: input.dimension } : {}),
  }

  if (input.status !== undefined) {
    data.status = input.status
    data.completedAt = input.status === "completed" ? new Date() : null
  }

  const result = await updateActionPlan(tenantId, planId, data)
  if (result.count === 0) {
    throw new AppError("ACTION_PLAN_NOT_FOUND", "Ação de clima não encontrada.")
  }

  await createAuditLog({
    tenantId,
    ...(actorId !== undefined ? { userId: actorId } : {}),
    action: "action_plan.updated",
    resource: "action_plans",
    resourceId: planId,
    metadata: { source: "climate_survey" },
  })

  if (input.status === "completed" && previousStatus !== "completed") {
    await recordClimateSurveyActionCompleted(tenantId, planId, climateDispatchId)
  }
}

export async function updateClimateSurveyActionPlanStatus(
  tenantId: string,
  planId: string,
  status: ActionPlan["status"],
  actorId?: string,
): Promise<void> {
  await updateClimateSurveyActionPlan(tenantId, planId, { status }, actorId)
}
