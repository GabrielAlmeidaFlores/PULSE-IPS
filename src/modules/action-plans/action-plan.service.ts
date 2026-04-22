import {
  findActionPlansByTenant,
  findActionPlanById,
  createActionPlan,
  updateActionPlan,
  createActionPlanTask,
  completeActionPlanTask,
  createActionPlanWithTasks,
  type ActionPlanWithTasks,
} from "@/modules/action-plans/action-plan.repository"
import type { CreateActionPlanInput, UpdateActionPlanInput, CreateActionPlanTaskInput } from "@/modules/action-plans/action-plan.types"
import type { ActionPlan, ActionPlanTask } from "@prisma/client"

export function getActionPlans(tenantId: string): Promise<ActionPlanWithTasks[]> {
  return findActionPlansByTenant(tenantId)
}

export function getActionPlan(tenantId: string, planId: string): Promise<ActionPlanWithTasks | null> {
  return findActionPlanById(tenantId, planId)
}

export function createPlan(tenantId: string, input: CreateActionPlanInput): Promise<ActionPlan> {
  return createActionPlan(tenantId, input)
}

export function updatePlan(
  tenantId: string,
  planId: string,
  input: UpdateActionPlanInput,
): Promise<{ count: number }> {
  const data: UpdateActionPlanInput = {
    ...input,
    ...(input.status === "completed" ? { completedAt: new Date() } : {}),
  }
  return updateActionPlan(tenantId, planId, data)
}

export function addTask(tenantId: string, actionPlanId: string, input: CreateActionPlanTaskInput): Promise<ActionPlanTask> {
  return createActionPlanTask(tenantId, actionPlanId, input)
}

export function completeTask(tenantId: string, taskId: string): Promise<ActionPlanTask> {
  return completeActionPlanTask(tenantId, taskId)
}

export function createPlanWithTasks(
  tenantId: string,
  input: CreateActionPlanInput,
  taskTitles: string[],
): Promise<ActionPlan> {
  return createActionPlanWithTasks(tenantId, input, taskTitles)
}
