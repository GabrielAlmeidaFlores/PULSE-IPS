import { prisma } from "@/libs/db"
import type { Plan, PlanPrice } from "@prisma/client"
import type { CreatePlanInput, UpdatePlanInput, CreatePlanPriceRecord } from "@/modules/plans/plan.types"

export type PlanWithPrices = Plan & { prices: PlanPrice[] }

export function findAllPlans(): Promise<PlanWithPrices[]> {
  return prisma.plan.findMany({
    where: { isActive: true },
    include: { prices: { where: { isActive: true } } },
    orderBy: { createdAt: "asc" },
  })
}

export function findAllPlansIncludingInactive(): Promise<PlanWithPrices[]> {
  return prisma.plan.findMany({
    include: { prices: true },
    orderBy: { createdAt: "asc" },
  })
}

export function findPlanById(planId: string): Promise<PlanWithPrices | null> {
  return prisma.plan.findUnique({
    where: { id: planId },
    include: { prices: { where: { isActive: true } } },
  })
}

export function createPlan(data: CreatePlanInput & { externalProductId?: string | undefined }): Promise<Plan> {
  return prisma.plan.create({
    data: {
      name: data.name,
      maxEmployees: data.maxEmployees,
      ...(data.description !== undefined && { description: data.description }),
      ...(data.externalProductId !== undefined && { externalProductId: data.externalProductId }),
    },
  })
}

export function updatePlan(planId: string, data: UpdatePlanInput): Promise<Plan> {
  return prisma.plan.update({
    where: { id: planId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.maxEmployees !== undefined && { maxEmployees: data.maxEmployees }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.externalProductId !== undefined && { externalProductId: data.externalProductId }),
    },
  })
}

export function createPlanPrice(data: CreatePlanPriceRecord): Promise<PlanPrice> {
  return prisma.planPrice.create({
    data: {
      planId: data.planId,
      ...(data.externalPriceId !== undefined && { externalPriceId: data.externalPriceId }),
      priceInCents: data.priceInCents,
      currency: data.currency,
      interval: data.interval,
    },
  })
}

export function deactivatePlanPrice(priceId: string): Promise<PlanPrice> {
  return prisma.planPrice.update({
    where: { id: priceId },
    data: { isActive: false },
  })
}

export function findPlanPriceById(priceId: string): Promise<(PlanPrice & { plan: Plan }) | null> {
  return prisma.planPrice.findUnique({
    where: { id: priceId },
    include: { plan: true },
  })
}

export function updatePlanPriceRecord(
  priceId: string,
  data: { priceInCents?: number; externalPriceId?: string },
): Promise<PlanPrice> {
  return prisma.planPrice.update({
    where: { id: priceId },
    data,
  })
}

export function updatePlanPriceAmount(priceId: string, priceInCents: number): Promise<PlanPrice> {
  return prisma.planPrice.update({
    where: { id: priceId },
    data: { priceInCents },
  })
}

export function countOrgsUsingPlan(planId: string): Promise<number> {
  return prisma.organization.count({ where: { planId } })
}

export async function deletePlan(planId: string): Promise<void> {
  await prisma.planPrice.deleteMany({ where: { planId } })
  await prisma.plan.delete({ where: { id: planId } })
}

export function findPlanPriceWithPlan(priceId: string): Promise<(PlanPrice & { plan: Plan }) | null> {
  return prisma.planPrice.findUnique({
    where: { id: priceId, isActive: true },
    include: { plan: true },
  })
}
