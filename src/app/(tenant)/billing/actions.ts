"use server"
import { z } from "zod"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getSession } from "@/modules/auth/session"
import { assertOrgAdmin } from "@/libs/auth/permissions"
import { createCheckoutSession, getBillingPortalUrl } from "@/modules/billing/billing.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const priceIdSchema = z.string().min(1).max(255)

export async function startCheckoutAction(externalPriceId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  assertOrgAdmin(session)
  const parsed = priceIdSchema.safeParse(externalPriceId)
  if (!parsed.success) return { error: "Plano inválido." }
  try {
    const url = await createCheckoutSession(session.tenantId, parsed.data)
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
  assertOrgAdmin(session)
  try {
    const url = await getBillingPortalUrl(session.tenantId)
    redirect(url)
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
