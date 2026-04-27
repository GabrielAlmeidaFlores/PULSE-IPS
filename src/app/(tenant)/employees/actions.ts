"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getSession } from "@/modules/auth/session"
import { sendConsentInvite } from "@/modules/consent/consent.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

export async function resendConsentInviteAction(employeeId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) redirect("/login")

  try {
    await sendConsentInvite(session.tenantId, employeeId)
    revalidatePath("/employees")
    return {}
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
