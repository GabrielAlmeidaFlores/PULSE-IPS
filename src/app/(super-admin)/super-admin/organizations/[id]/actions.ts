"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { getSuperAdminSession } from "@/modules/auth/session"
import { cancelScheduledOrganizationDeletion } from "@/modules/organizations/account-deletion.service"
import { setOrgTrial, setOrgMaxEmployeesOverride } from "@/modules/organizations/organization.service"
import { cancelOrgSubscriptionAsAdmin, assignPlanToOrgAsAdmin } from "@/modules/billing/billing.service"
import { setOrgTrialSchema } from "@/modules/organizations/organization.schema"
import type { ActionResult } from "@/libs/utils/action-result"
import { AppError } from "@/libs/errors/app-error"

const SUPER_ADMIN_LOGIN_PATH = "/super-admin/login"
const INVALID_ID_ERROR = "ID inválido."

export async function cancelOrganizationDeletionAction(organizationId: string): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) redirect(SUPER_ADMIN_LOGIN_PATH)
  const idParsed = z.string().uuid().safeParse(organizationId)
  if (!idParsed.success) return { error: INVALID_ID_ERROR }
  try {
    await cancelScheduledOrganizationDeletion(idParsed.data)
    revalidatePath(`/super-admin/organizations/${idParsed.data}`)
    return {}
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function setOrgTrialAction(
  organizationId: string,
  trialExpiresAt: string | null,
): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) redirect(SUPER_ADMIN_LOGIN_PATH)
  const idParsed = z.string().uuid().safeParse(organizationId)
  if (!idParsed.success) return { error: INVALID_ID_ERROR }

  let expiresDate: Date | null = null
  if (trialExpiresAt !== null) {
    const parsed = setOrgTrialSchema.safeParse({ trialExpiresAt })
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data inválida." }
    expiresDate = new Date(parsed.data.trialExpiresAt)
  }

  try {
    await setOrgTrial(idParsed.data, expiresDate)
    revalidatePath(`/super-admin/organizations/${idParsed.data}`)
    revalidatePath("/super-admin/organizations")
    return {}
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function cancelOrgSubscriptionAction(organizationId: string): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) redirect(SUPER_ADMIN_LOGIN_PATH)
  const idParsed = z.string().uuid().safeParse(organizationId)
  if (!idParsed.success) return { error: INVALID_ID_ERROR }
  try {
    await cancelOrgSubscriptionAsAdmin(idParsed.data)
    revalidatePath(`/super-admin/organizations/${idParsed.data}`)
    revalidatePath("/super-admin/organizations")
    return {}
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function assignPlanToOrgAction(
  organizationId: string,
  planPriceId: string,
  trialExpiresAt: string | null,
): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) redirect(SUPER_ADMIN_LOGIN_PATH)

  const idParsed = z.string().uuid().safeParse(organizationId)
  if (!idParsed.success) return { error: INVALID_ID_ERROR }

  const priceIdParsed = z.string().uuid().safeParse(planPriceId)
  if (!priceIdParsed.success) return { error: "Preço inválido." }

  let expiresDate: Date | null | undefined = undefined
  if (trialExpiresAt !== null) {
    const parsed = setOrgTrialSchema.safeParse({ trialExpiresAt })
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data de trial inválida." }
    expiresDate = new Date(parsed.data.trialExpiresAt)
  } else {
    expiresDate = null
  }

  try {
    await assignPlanToOrgAsAdmin(idParsed.data, priceIdParsed.data, expiresDate)
    revalidatePath(`/super-admin/organizations/${idParsed.data}`)
    revalidatePath("/super-admin/organizations")
    return {}
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function setOrgMaxEmployeesOverrideAction(
  organizationId: string,
  value: string,
): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) redirect(SUPER_ADMIN_LOGIN_PATH)

  const idParsed = z.string().uuid().safeParse(organizationId)
  if (!idParsed.success) return { error: INVALID_ID_ERROR }

  let finalValue: number | null = null
  if (value !== "") {
    const parsed = z.coerce.number().int().min(1).safeParse(value)
    if (!parsed.success) return { error: "Valor inválido. Use um número inteiro maior que zero." }
    finalValue = parsed.data
  }

  try {
    await setOrgMaxEmployeesOverride(idParsed.data, finalValue)
    revalidatePath(`/super-admin/organizations/${idParsed.data}`)
    return {}
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
