"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { getSuperAdminSession } from "@/modules/auth/session"
import { cancelScheduledOrganizationDeletion } from "@/modules/organizations/account-deletion.service"
import { setOrgTrial } from "@/modules/organizations/organization.service"
import { setOrgTrialSchema } from "@/modules/organizations/organization.schema"
import type { ActionResult } from "@/libs/utils/action-result"
import { AppError } from "@/libs/errors/app-error"

export async function cancelOrganizationDeletionAction(organizationId: string): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) redirect("/super-admin/login")
  const idParsed = z.string().uuid().safeParse(organizationId)
  if (!idParsed.success) return { error: "ID inválido." }
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
  if (!session) redirect("/super-admin/login")
  const idParsed = z.string().uuid().safeParse(organizationId)
  if (!idParsed.success) return { error: "ID inválido." }

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
