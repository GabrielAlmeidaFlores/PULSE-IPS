import { prisma } from "@/libs/db"

export interface ActionPlanSuggestionWithTasks {
  id: string
  tenantId: string
  suggestionKey: string
  title: string
  description: string
  priority: string
  reason: string
  status: string
  createdAt: Date
  tasks: { id: string; title: string; sortOrder: number }[]
}

interface CreateActionPlanSuggestionInput {
  suggestionKey: string
  title: string
  description: string
  priority: string
  reason: string
  tasks: string[]
}

export function findPendingActionPlanSuggestions(tenantId: string): Promise<ActionPlanSuggestionWithTasks[]> {
  return prisma.actionPlanSuggestion.findMany({
    where: { tenantId, status: "pending" },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  })
}

export function findExistingActionPlanSuggestionKeysForTenant(
  tenantId: string,
): Promise<{ suggestionKey: string }[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return prisma.actionPlanSuggestion.findMany({
    where: {
      tenantId,
      OR: [
        { status: "pending" },
        { status: "converted" },
        { status: "dismissed", dismissedAt: { gte: thirtyDaysAgo } },
      ],
    },
    select: { suggestionKey: true },
  })
}

export async function createActionPlanSuggestion(
  tenantId: string,
  data: CreateActionPlanSuggestionInput,
): Promise<void> {
  await prisma.actionPlanSuggestion.create({
    data: {
      tenantId,
      suggestionKey: data.suggestionKey,
      title: data.title,
      description: data.description,
      priority: data.priority,
      reason: data.reason,
      status: "pending",
      tasks: {
        create: data.tasks.map((title, index) => ({ title, sortOrder: index })),
      },
    },
  })
}

export async function dismissActionPlanSuggestion(
  tenantId: string,
  id: string,
  dismissedBy: string,
): Promise<void> {
  await prisma.actionPlanSuggestion.updateMany({
    where: { id, tenantId },
    data: { status: "dismissed", dismissedAt: new Date(), dismissedBy },
  })
}

export async function convertActionPlanSuggestion(
  tenantId: string,
  id: string,
  actionPlanId: string,
): Promise<void> {
  await prisma.actionPlanSuggestion.updateMany({
    where: { id, tenantId },
    data: { status: "converted", actionPlanId },
  })
}
