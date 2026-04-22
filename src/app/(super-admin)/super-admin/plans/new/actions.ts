"use server"

import { z } from "zod"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { createNewPlan, addDirectPriceToPlan } from "@/modules/plans/plan.service"
import type { BillingInterval } from "@/modules/plans/plan.types"

const createPlanSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  maxEmployees: z.number().int().min(0),
  monthlyPriceInCents: z.number().int().min(0).optional(),
  yearlyPriceInCents: z.number().int().min(0).optional(),
})

export async function createPlanAction(input: unknown): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = createPlanSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    const plan = await createNewPlan({
      name: parsed.data.name,
      maxEmployees: parsed.data.maxEmployees,
      ...(parsed.data.description ? { description: parsed.data.description } : {}),
    })

    if (parsed.data.monthlyPriceInCents && parsed.data.monthlyPriceInCents > 0) {
      await addDirectPriceToPlan({ planId: plan.id, priceInCents: parsed.data.monthlyPriceInCents, interval: "month" as BillingInterval })
    }
    if (parsed.data.yearlyPriceInCents && parsed.data.yearlyPriceInCents > 0) {
      await addDirectPriceToPlan({ planId: plan.id, priceInCents: parsed.data.yearlyPriceInCents, interval: "year" as BillingInterval })
    }

    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
