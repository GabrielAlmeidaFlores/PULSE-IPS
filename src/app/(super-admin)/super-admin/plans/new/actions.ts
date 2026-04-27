"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { createNewPlan, addDirectPriceToPlan, updatePlanFeatures } from "@/modules/plans/plan.service"
import type { BillingInterval, PlanFeature } from "@/modules/plans/plan.types"
import { createPlanSchema, setPlanFeaturesSchema } from "@/modules/plans/plan.schema"

export async function createPlanAction(input: unknown): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = createPlanSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    const plan = await createNewPlan({
      name: parsed.data.name,
      maxEmployees: parsed.data.maxEmployees,
      features: parsed.data.features as PlanFeature[],
      ...(parsed.data.description ? { description: parsed.data.description } : {}),
    })

    if (parsed.data.monthlyPriceInCents && parsed.data.monthlyPriceInCents > 0) {
      await addDirectPriceToPlan({ planId: plan.id, priceInCents: parsed.data.monthlyPriceInCents, interval: "month" as BillingInterval })
    }
    if (parsed.data.yearlyPriceInCents && parsed.data.yearlyPriceInCents > 0) {
      await addDirectPriceToPlan({ planId: plan.id, priceInCents: parsed.data.yearlyPriceInCents, interval: "year" as BillingInterval })
    }

    revalidatePath("/super-admin/plans")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}

export async function setPlanFeaturesAction(input: unknown): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = setPlanFeaturesSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await updatePlanFeatures({ planId: parsed.data.planId, features: parsed.data.features as PlanFeature[] })
    revalidatePath("/super-admin/plans")
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
