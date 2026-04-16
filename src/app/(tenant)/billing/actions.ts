"use server"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getSession } from "@/modules/auth/session"
import { createCheckoutSession, getBillingPortalUrl } from "@/modules/billing/billing.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"


export async function startCheckoutAction(externalPriceId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    const url = await createCheckoutSession(session.tenantId, externalPriceId)
    redirect(url)
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function openBillingPortalAction(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    const url = await getBillingPortalUrl(session.tenantId)
    redirect(url)
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
