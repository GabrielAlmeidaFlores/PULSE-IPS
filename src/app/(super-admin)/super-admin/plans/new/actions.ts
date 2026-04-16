"use server"

import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { createNewPlan, addDirectPriceToPlan } from "@/modules/plans/plan.service"
import type { BillingInterval } from "@/modules/plans/plan.types"

export async function createPlanAction(input: {
  name: string
  description: string
  maxEmployees: number
  monthlyPriceInCents?: number | undefined
  yearlyPriceInCents?: number | undefined
}): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    const plan = await createNewPlan({
      name: input.name,
      maxEmployees: input.maxEmployees,
      ...(input.description ? { description: input.description } : {}),
    })

    if (input.monthlyPriceInCents && input.monthlyPriceInCents > 0) {
      await addDirectPriceToPlan({ planId: plan.id, priceInCents: input.monthlyPriceInCents, interval: "month" as BillingInterval })
    }
    if (input.yearlyPriceInCents && input.yearlyPriceInCents > 0) {
      await addDirectPriceToPlan({ planId: plan.id, priceInCents: input.yearlyPriceInCents, interval: "year" as BillingInterval })
    }

    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
