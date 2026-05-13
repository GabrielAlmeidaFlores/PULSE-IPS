"use server"

import { z } from "zod"
import type { ActionResult } from "@/libs/utils/action-result"
import { requestPasswordReset } from "@/modules/auth/auth.service"
import { enforceRateLimit, getClientIp } from "@/libs/rate-limit"

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }).max(255),
  orgSlug: z.string().min(1, { message: "Informe o identificador da organização." }).max(100),
})

export async function forgotPasswordAction(input: {
  email: string
  orgSlug: string
}): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) return { error: "Dados inválidos." }

  const ip = await getClientIp()
  const rateLimitError = await enforceRateLimit(`rl:forgot-password:${ip}`, 5, 900)
  if (rateLimitError !== null) return { error: rateLimitError }

  try {
    await requestPasswordReset(parsed.data.email, parsed.data.orgSlug)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
