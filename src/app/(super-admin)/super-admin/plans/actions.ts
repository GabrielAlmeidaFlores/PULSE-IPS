"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { updatePlanDetails, togglePlanActive, deletePlanById, updatePlanPriceValue, addDirectPriceToPlan } from "@/modules/plans/plan.service"
import type { BillingInterval } from "@/modules/plans/plan.types"

const UNEXPECTED_ERROR = "Erro inesperado. Tente novamente."
const PLANS_PATH = "/super-admin/plans"
const SESSION_EXPIRED = "Sessão expirada."

export async function updatePlanAction(input: {
  planId: string
  name: string
  description: string
  maxEmployees: number
}): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  try {
    await updatePlanDetails(input.planId, {
      name: input.name,
      description: input.description || undefined,
      maxEmployees: input.maxEmployees,
    })
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}

export async function addPlanPriceAction(planId: string, priceInCents: number, interval: BillingInterval): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  try {
    await addDirectPriceToPlan({ planId, priceInCents, interval })
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}

export async function updatePlanPriceAction(priceId: string, priceInCents: number): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  try {
    await updatePlanPriceValue(priceId, priceInCents)
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}

export async function togglePlanActiveAction(planId: string, isActive: boolean): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  try {
    await togglePlanActive(planId, isActive)
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  try {
    await deletePlanById(planId)
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}
