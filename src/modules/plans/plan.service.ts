import { getBillingService } from "@/libs/integrations"
import {
  findAllPlans,
  findAllPlansIncludingInactive,
  findPlanById,
  findPlanPriceById,
  createPlan,
  createPlanPrice,
  updatePlan,
  updatePlanPriceAmount,
  updatePlanPriceRecord,
  countOrgsUsingPlan,
  deletePlan,
  findPlanPriceWithPlan,
  type PlanWithPrices,
} from "@/modules/plans/plan.repository"
import type { CreatePlanInput, CreatePlanPriceInput, UpdatePlanInput, AddDirectPriceInput } from "@/modules/plans/plan.types"
import type { Plan, PlanPrice } from "@prisma/client"
import { AppError } from "@/libs/errors/app-error"

export function getAllPlans(): Promise<PlanWithPrices[]> {
  return findAllPlans()
}

export function getAllPlansAdmin(): Promise<PlanWithPrices[]> {
  return findAllPlansIncludingInactive()
}

export function getPlan(planId: string): Promise<PlanWithPrices | null> {
  return findPlanById(planId)
}

export function getPlanPriceWithPlan(priceId: string): Promise<(PlanPrice & { plan: Plan }) | null> {
  return findPlanPriceWithPlan(priceId)
}

export async function createNewPlan(input: CreatePlanInput): Promise<Plan> {
  const billing = getBillingService()
  const product = await billing.createProduct({
    name: input.name,
    ...(input.description !== undefined ? { description: input.description } : {}),
  })
  return createPlan({ ...input, externalProductId: product.id })
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
  const count = await countOrgsUsingPlan(planId)
  if (count > 0) throw new AppError("PLAN_IN_USE", `Este plano está vinculado a ${count} organização(ões) e não pode ser excluído.`)
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
