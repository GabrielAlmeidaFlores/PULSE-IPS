"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSuperAdminSession } from "@/modules/auth/session"
import { updatePlanDetails, togglePlanActive, deletePlanById, updatePlanPriceValue, addDirectPriceToPlan, removePlanPriceFromPlan } from "@/modules/plans/plan.service"
import type { BillingInterval } from "@/modules/plans/plan.types"

const UNEXPECTED_ERROR = "Erro inesperado. Tente novamente."
const PLANS_PATH = "/super-admin/plans"
const SESSION_EXPIRED = "Sessão expirada."

const uuidSchema = z.string().uuid()

const updatePlanSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500),
  maxEmployees: z.number().int().min(0),
})

const addPriceSchema = z.object({
  planId: z.string().uuid(),
  priceInCents: z.number().int().min(1).max(100_000_000),
  interval: z.enum(["month", "year"]),
})

const updatePriceSchema = z.object({
  priceId: z.string().uuid(),
  priceInCents: z.number().int().min(1).max(100_000_000),
})

export async function updatePlanAction(input: unknown): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  const parsed = updatePlanSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await updatePlanDetails(parsed.data.planId, {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      maxEmployees: parsed.data.maxEmployees,
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
  const parsed = addPriceSchema.safeParse({ planId, priceInCents, interval })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await addDirectPriceToPlan({ planId: parsed.data.planId, priceInCents: parsed.data.priceInCents, interval: parsed.data.interval as BillingInterval })
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}

export async function updatePlanPriceAction(priceId: string, priceInCents: number): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  const parsed = updatePriceSchema.safeParse({ priceId, priceInCents })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await updatePlanPriceValue(parsed.data.priceId, parsed.data.priceInCents)
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}

export async function togglePlanActiveAction(planId: string, isActive: boolean): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  const idParsed = uuidSchema.safeParse(planId)
  if (!idParsed.success) return { error: "ID inválido." }
  try {
    await togglePlanActive(idParsed.data, isActive)
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  const idParsed = uuidSchema.safeParse(planId)
  if (!idParsed.success) return { error: "ID inválido." }
  try {
    await deletePlanById(idParsed.data)
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}

export async function deactivatePlanPriceAction(priceId: string): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) return { error: SESSION_EXPIRED }
  const idParsed = uuidSchema.safeParse(priceId)
  if (!idParsed.success) return { error: "ID inválido." }
  try {
    await removePlanPriceFromPlan(idParsed.data)
    revalidatePath(PLANS_PATH)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : UNEXPECTED_ERROR }
  }
}
