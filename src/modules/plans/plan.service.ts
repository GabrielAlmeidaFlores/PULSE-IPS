import { getBillingService } from "@/libs/integrations"
import {
  findAllPlans,
  findAllPlansIncludingInactive,
  findAllPlansPaginated,
  findPlanById,
  findPlanPriceById,
  createPlan,
  createPlanPrice,
  updatePlan,
  updatePlanPriceAmount,
  updatePlanPriceRecord,
  deletePlan,
  findPlanPriceWithPlan,
  setPlanFeatures,
  findPlanFeatures,
  type PlanWithPricesAndFeatures,
} from "@/modules/plans/plan.repository"
import type { CreatePlanInput, CreatePlanPriceInput, UpdatePlanInput, AddDirectPriceInput, PlanFeature, SetPlanFeaturesInput } from "@/modules/plans/plan.types"
import type { Plan, PlanPrice } from "@prisma/client"
import { AppError } from "@/libs/errors/app-error"

export type { PlanWithPricesAndFeatures }

export function getAllPlans(): Promise<PlanWithPricesAndFeatures[]> {
  return findAllPlans()
}

export function getAllPlansAdmin(): Promise<PlanWithPricesAndFeatures[]> {
  return findAllPlansIncludingInactive()
}

interface PlanAdminListingQuery {
  page: number
  pageSize: number
}

export function getAllPlansPaginated(
  query: PlanAdminListingQuery,
): ReturnType<typeof findAllPlansPaginated> {
  const skip = (query.page - 1) * query.pageSize
  return findAllPlansPaginated(skip, query.pageSize)
}

export function getPlan(planId: string): Promise<PlanWithPricesAndFeatures | null> {
  return findPlanById(planId)
}

export function getPlanPriceWithPlan(priceId: string): Promise<(PlanPrice & { plan: Plan }) | null> {
  return findPlanPriceWithPlan(priceId)
}

export function getPlanFeatures(planId: string): Promise<PlanFeature[]> {
  return findPlanFeatures(planId)
}

export async function updatePlanFeatures(input: SetPlanFeaturesInput): Promise<void> {
  const plan = await findPlanById(input.planId)
  if (!plan) throw new AppError("PLAN_NOT_FOUND", "Plano não encontrado.")
  await setPlanFeatures(input.planId, input.features)
}

export async function createNewPlan(input: CreatePlanInput): Promise<Plan> {
  const billing = getBillingService()
  const product = await billing.createProduct({
    name: input.name,
    ...(input.description !== undefined ? { description: input.description } : {}),
  })
  const plan = await createPlan({ ...input, externalProductId: product.id })
  if (input.features && input.features.length > 0) {
    await setPlanFeatures(plan.id, input.features)
  }
  return plan
}

export function updatePlanDetails(planId: string, input: Pick<UpdatePlanInput, "name" | "description" | "maxEmployees">): Promise<Plan> {
  return updatePlan(planId, input)
}

export function togglePlanActive(planId: string, isActive: boolean): Promise<Plan> {
  return updatePlan(planId, { isActive })
}

export async function updatePlanPriceValue(priceId: string, priceInCents: number): Promise<PlanPrice> {
  const existing = await findPlanPriceById(priceId)
  if (!existing) throw new AppError("PRICE_NOT_FOUND", "Preço não encontrado.")

  if (existing.externalPriceId && existing.plan.externalProductId) {
    const billing = getBillingService()
    const newPrice = await billing.createPrice({
      externalProductId: existing.plan.externalProductId,
      unitAmountInCents: priceInCents,
      currency: existing.currency,
      interval: existing.interval as "month" | "year",
    })
    return updatePlanPriceRecord(priceId, { priceInCents, externalPriceId: newPrice.id })
  }

  return updatePlanPriceAmount(priceId, priceInCents)
}

export async function addDirectPriceToPlan(input: AddDirectPriceInput): Promise<PlanPrice> {
  const plan = await findPlanById(input.planId)

  if (plan?.externalProductId) {
    const billing = getBillingService()
    const price = await billing.createPrice({
      externalProductId: plan.externalProductId,
      unitAmountInCents: input.priceInCents,
      currency: "brl",
      interval: input.interval,
    })
    return createPlanPrice({
      planId: input.planId,
      priceInCents: input.priceInCents,
      currency: "brl",
      interval: input.interval,
      externalPriceId: price.id,
    })
  }

  return createPlanPrice({
    planId: input.planId,
    priceInCents: input.priceInCents,
    currency: "brl",
    interval: input.interval,
  })
}

export async function deletePlanById(planId: string): Promise<void> {
  const plan = await findPlanById(planId)
  if (!plan) throw new AppError("PLAN_NOT_FOUND", "Plano não encontrado.")
  return deletePlan(planId)
}

export async function addPriceToPlan(input: CreatePlanPriceInput): Promise<PlanPrice> {
  const plan = await findPlanById(input.planId)
  if (!plan?.externalProductId) throw new AppError("PLAN_NO_PRODUCT", "Este plano não possui um produto de cobrança configurado.")

  const billing = getBillingService()
  const price = await billing.createPrice({
    externalProductId: plan.externalProductId,
    unitAmountInCents: input.unitAmountInCents,
    currency: input.currency,
    interval: input.interval,
  })

  return createPlanPrice({
    planId: input.planId,
    externalPriceId: price.id,
    priceInCents: input.unitAmountInCents,
    currency: input.currency,
    interval: input.interval,
  })
}
