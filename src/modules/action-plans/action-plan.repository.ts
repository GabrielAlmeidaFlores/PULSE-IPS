import { prisma } from "@/libs/db"
import { AppError } from "@/libs/errors/app-error"
import type { Prisma, ActionPlan, ActionPlanTask } from "@prisma/client"
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
    include: { tasks: { where: { tenantId }, orderBy: { createdAt: "asc" } } },
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
      ...(data.alertId !== undefined && { alertId: data.alertId }),
      ...(data.reportId !== undefined && { reportId: data.reportId }),
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
      ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
    },
  })
}

export async function createActionPlanTask(tenantId: string, actionPlanId: string, data: CreateActionPlanTaskInput): Promise<ActionPlanTask> {
  const plan = await prisma.actionPlan.findFirst({ where: { id: actionPlanId, tenantId } })
  if (!plan) throw new AppError("ACTION_PLAN_NOT_FOUND", "Plano de ação não encontrado.")
  return prisma.actionPlanTask.create({
    data: {
      tenantId,
      actionPlanId,
      title: data.title,
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
    },
  })
}

export function completeActionPlanTask(tenantId: string, taskId: string): Promise<ActionPlanTask> {
  return prisma.actionPlanTask.update({
    where: { id: taskId, tenantId },
    data: { completedAt: new Date() },
  })
}

export function createActionPlanWithTasks(
  tenantId: string,
  data: CreateActionPlanInput,
  taskTitles: string[],
): Promise<ActionPlan> {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.actionPlan.create({
      data: {
        tenantId,
        title: data.title,
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.alertId !== undefined && { alertId: data.alertId }),
        ...(data.reportId !== undefined && { reportId: data.reportId }),
      },
    })
    if (taskTitles.length > 0) {
      await tx.actionPlanTask.createMany({
        data: taskTitles.map((title) => ({ tenantId, actionPlanId: plan.id, title })),
      })
    }
    return plan
  })
}

export interface SuggestionContextData {
  openAlerts: {
    id: string
    type: string
    severity: string
    departmentId: string | null
    message: string
    createdAt: Date
    department: { name: string } | null
  }[]
  openReports: { category: string | null; status: string; createdAt: Date }[]
  recentPlanTitles: { title: string }[]
  consentPendingByDept: { departmentId: string; _count: { departmentId: number } }[]
  lastPgrReview: { period: string; createdAt: Date } | null
  recentDispatches: {
    id: string
    totalRecipients: number
    totalResponses: number
    dispatchedAt: Date | null
    surveyConfiguration: { department: { name: string } }
  }[]
  deptNamesById: Map<string, string>
}

export async function findSuggestionContextData(tenantId: string): Promise<SuggestionContextData> {
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [openAlerts, openReports, recentPlanTitles, consentPendingByDept, lastPgrReview, recentDispatches] = await Promise.all([
    prisma.alert.findMany({
      where: { tenantId, resolvedAt: null },
      select: {
        id: true,
        type: true,
        severity: true,
        departmentId: true,
        message: true,
        createdAt: true,
        department: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.anonymousReport.findMany({
      where: { tenantId, status: { in: ["open", "analyzing"] } },
      select: { category: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.actionPlan.findMany({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      select: { title: true },
    }),
    prisma.employee.groupBy({
      by: ["departmentId"],
      where: { tenantId, status: "active", consents: { none: { event: "accepted" } } },
      _count: { departmentId: true },
      orderBy: { _count: { departmentId: "desc" } },
    }),
    prisma.pgrReview.findFirst({
      where: { tenantId },
      select: { period: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.surveyDispatch.findMany({
      where: { tenantId, status: "sent", dispatchedAt: { gte: thirtyDaysAgo }, totalRecipients: { gt: 0 } },
      select: {
        id: true,
        totalRecipients: true,
        totalResponses: true,
        dispatchedAt: true,
        surveyConfiguration: { select: { department: { select: { name: true } } } },
      },
      orderBy: { dispatchedAt: "desc" },
      take: 10,
    }),
  ])

  const consentDeptIds = consentPendingByDept.map((g) => g.departmentId)
  const consentDepts =
    consentDeptIds.length > 0
      ? await prisma.department.findMany({
          where: { id: { in: consentDeptIds } },
          select: { id: true, name: true },
        })
      : []
  const deptNamesById = new Map(consentDepts.map((d) => [d.id, d.name]))

  return {
    openAlerts,
    openReports,
    recentPlanTitles,
    consentPendingByDept,
    lastPgrReview,
    recentDispatches,
    deptNamesById,
  }
}

export interface ActionPlanListingFilters {
  q?: string
  status?: string
}

export async function findActionPlansForListingPage(
  tenantId: string,
  filters: ActionPlanListingFilters,
  skip: number,
  take: number,
): Promise<{ items: ActionPlanWithTasks[]; total: number }> {
  const where: Prisma.ActionPlanWhereInput = { tenantId }
  if (filters.q !== undefined) {
    where.title = { contains: filters.q, mode: "insensitive" }
  }
  if (filters.status !== undefined) {
    where.status = filters.status
  }
  const [items, total] = await Promise.all([
    prisma.actionPlan.findMany({ where, include: { tasks: true }, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.actionPlan.count({ where }),
  ])
  return { items, total }
}
