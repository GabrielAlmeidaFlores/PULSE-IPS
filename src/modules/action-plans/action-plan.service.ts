import {
  findActionPlansByTenant,
  findActionPlanById,
  findActionPlansForListingPage,
  createActionPlan,
  updateActionPlan,
  createActionPlanTask,
  completeActionPlanTask,
  createActionPlanWithTasks,
  type ActionPlanWithTasks,
  type ActionPlanListingFilters,
} from "@/modules/action-plans/action-plan.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"
import type { CreateActionPlanInput, UpdateActionPlanInput, CreateActionPlanTaskInput, ActionPlan, ActionPlanTask } from "@/modules/action-plans/action-plan.types"

export function getActionPlans(tenantId: string): Promise<ActionPlanWithTasks[]> {
  return findActionPlansByTenant(tenantId)
}

export function getActionPlan(tenantId: string, planId: string): Promise<ActionPlanWithTasks | null> {
  return findActionPlanById(tenantId, planId)
}

export async function createPlan(tenantId: string, input: CreateActionPlanInput, actorId?: string): Promise<ActionPlan> {
  const plan = await createActionPlan(tenantId, input)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "action_plan.created", resource: "action_plans", resourceId: plan.id, metadata: { title: plan.title } })
  return plan
}

export async function updatePlan(
  tenantId: string,
  planId: string,
  input: UpdateActionPlanInput,
  actorId?: string,
): Promise<{ count: number }> {
  const data: UpdateActionPlanInput = {
    ...input,
    ...(input.status === "completed" ? { completedAt: new Date() } : {}),
  }
  const result = await updateActionPlan(tenantId, planId, data)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "action_plan.updated", resource: "action_plans", resourceId: planId })
  return result
}

export function addTask(tenantId: string, actionPlanId: string, input: CreateActionPlanTaskInput): Promise<ActionPlanTask> {
  return createActionPlanTask(tenantId, actionPlanId, input)
}

export function completeTask(tenantId: string, taskId: string): Promise<ActionPlanTask> {
  return completeActionPlanTask(tenantId, taskId)
}

export async function createPlanWithTasks(
  tenantId: string,
  input: CreateActionPlanInput,
  taskTitles: string[],
  actorId?: string,
): Promise<ActionPlan> {
  const plan = await createActionPlanWithTasks(tenantId, input, taskTitles)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "action_plan.created", resource: "action_plans", resourceId: plan.id, metadata: { title: plan.title } })
  return plan
}

interface ActionPlanListingQuery {
  q?: string
  status?: string
  page: number
  pageSize: number
}

export function getActionPlansPaginated(
  tenantId: string,
  query: ActionPlanListingQuery,
): ReturnType<typeof findActionPlansForListingPage> {
  const skip = (query.page - 1) * query.pageSize
  const filters: ActionPlanListingFilters = {}
  if (query.q !== undefined) filters.q = query.q
  if (query.status !== undefined) filters.status = query.status
  return findActionPlansForListingPage(tenantId, filters, skip, query.pageSize)
}
