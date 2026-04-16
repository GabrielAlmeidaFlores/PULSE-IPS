import { prisma } from "@/libs/db"
import type { ActionPlan, ActionPlanTask } from "@prisma/client"
import type { CreateActionPlanInput, CreateActionPlanTaskInput, UpdateActionPlanInput } from "@/modules/action-plans/action-plan.types"

export type ActionPlanWithTasks = ActionPlan & { tasks: ActionPlanTask[] }

export function findActionPlansByTenant(tenantId: string): Promise<ActionPlanWithTasks[]> {
  return prisma.actionPlan.findMany({
    where: { tenantId },
    include: { tasks: true },
    orderBy: { createdAt: "desc" },
  })
}

export function findActionPlanById(tenantId: string, planId: string): Promise<ActionPlanWithTasks | null> {
  return prisma.actionPlan.findFirst({
    where: { id: planId, tenantId },
    include: { tasks: { orderBy: { createdAt: "asc" } } },
  })
}

export function createActionPlan(tenantId: string, data: CreateActionPlanInput): Promise<ActionPlan> {
  return prisma.actionPlan.create({
    data: {
      tenantId,
      title: data.title,
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
    },
  })
}

export function updateActionPlan(
  tenantId: string,
  planId: string,
  data: UpdateActionPlanInput,
): Promise<{ count: number }> {
  return prisma.actionPlan.updateMany({
    where: { id: planId, tenantId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
    },
  })
}

export function createActionPlanTask(actionPlanId: string, data: CreateActionPlanTaskInput): Promise<ActionPlanTask> {
  return prisma.actionPlanTask.create({
    data: {
      actionPlanId,
      title: data.title,
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
    },
  })
}

export function completeActionPlanTask(taskId: string): Promise<ActionPlanTask> {
  return prisma.actionPlanTask.update({
    where: { id: taskId },
    data: { completedAt: new Date() },
  })
}
