"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { getSuperAdminSession } from "@/modules/auth/session"
import { cancelScheduledOrganizationDeletion } from "@/modules/organizations/account-deletion.service"
import type { ActionResult } from "@/libs/utils/action-result"
import { AppError } from "@/libs/errors/app-error"

export async function cancelOrganizationDeletionAction(organizationId: string): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (!session) redirect("/super-admin/login")
  try {
    await cancelScheduledOrganizationDeletion(organizationId)
    revalidatePath(`/super-admin/organizations/${organizationId}`)
    return {}
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
