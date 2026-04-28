import { prisma } from "@/libs/db"
import type { Plan, PlanPrice, PlanFeature as PrismaFeature } from "@prisma/client"
import type { CreatePlanInput, UpdatePlanInput, CreatePlanPriceRecord, PlanFeature, PlanWithFeatures } from "@/modules/plans/plan.types"

type PlanWithPrismaFeatures = Plan & { prices: PlanPrice[]; features: PrismaFeature[] }

function toPlanWithFeatures(raw: PlanWithPrismaFeatures): PlanWithFeatures & { prices: PlanPrice[] } {
  return {
    ...raw,
    features: raw.features.map((f) => f.feature as PlanFeature),
  }
}

export type PlanWithPricesAndFeatures = PlanWithFeatures & { prices: PlanPrice[] }

export function findAllPlans(): Promise<PlanWithPricesAndFeatures[]> {
  return prisma.plan.findMany({
    where: { isActive: true, deletedAt: null },
    include: { prices: { where: { isActive: true } }, features: true },
    orderBy: { createdAt: "asc" },
  }).then((plans) => plans.map(toPlanWithFeatures))
}

export function findAllPlansIncludingInactive(): Promise<PlanWithPricesAndFeatures[]> {
  return prisma.plan.findMany({
    where: { deletedAt: null },
    include: { prices: true, features: true },
    orderBy: { createdAt: "asc" },
  }).then((plans) => plans.map(toPlanWithFeatures))
}

export function findPlanById(planId: string): Promise<PlanWithPricesAndFeatures | null> {
  return prisma.plan.findUnique({
    where: { id: planId, deletedAt: null },
    include: { prices: { where: { isActive: true } }, features: true },
  }).then((plan) => (plan ? toPlanWithFeatures(plan) : null))
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

export async function setPlanFeatures(planId: string, features: PlanFeature[]): Promise<void> {
  await prisma.$transaction([
    prisma.planFeature.deleteMany({ where: { planId } }),
    prisma.planFeature.createMany({
      data: features.map((feature) => ({ planId, feature })),
    }),
  ])
}

export function findPlanFeatures(planId: string): Promise<PlanFeature[]> {
  return prisma.planFeature.findMany({ where: { planId } }).then((rows) => rows.map((r) => r.feature as PlanFeature))
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


export async function deletePlan(planId: string): Promise<void> {
  await prisma.plan.update({ where: { id: planId }, data: { deletedAt: new Date(), isActive: false } })
}

export function findPlanPriceWithPlan(priceId: string): Promise<(PlanPrice & { plan: Plan }) | null> {
  return prisma.planPrice.findUnique({
    where: { id: priceId, isActive: true },
    include: { plan: true },
  })
}

export async function findAllPlansPaginated(
  skip: number,
  take: number,
): Promise<{ items: PlanWithPricesAndFeatures[]; total: number }> {
  const [raw, total] = await Promise.all([
    prisma.plan.findMany({
      where: { deletedAt: null },
      include: { prices: true, features: true },
      orderBy: { createdAt: "asc" },
      skip,
      take,
    }),
    prisma.plan.count({ where: { deletedAt: null } }),
  ])
  return { items: raw.map(toPlanWithFeatures), total }
}
