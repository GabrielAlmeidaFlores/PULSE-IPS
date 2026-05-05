"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession, destroySession } from "@/modules/auth/session"
import { acceptTerms } from "@/modules/terms/terms.service"
import { getOrgUserById } from "@/modules/auth/auth.service"
import { extractClientIp } from "@/libs/utils/client-ip"

const termsVersionIdSchema = z.string().uuid()

export async function acceptTermsAction(termsVersionId: string): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { error: "Sessão expirada. Faça login novamente." }

    const idParsed = termsVersionIdSchema.safeParse(termsVersionId)
    if (!idParsed.success) return { error: "Versão de termos inválida." }

    const userExists = await getOrgUserById(session.userId, session.tenantId)
    if (!userExists) {
      await destroySession()
      redirect("/login")
    }

    const headersList = await headers()
    const ip = extractClientIp(headersList) ?? "unknown"
    const userAgent = headersList.get("user-agent") ?? "unknown"

    await acceptTerms({
      userId: session.userId,
      termsVersionId: idParsed.data,
      ipAddress: ip,
      userAgent,
    })

    redirect("/dashboard")
  } catch (error) {
    if (isRedirectError(error)) throw error
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
