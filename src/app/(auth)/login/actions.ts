"use server"

import { z } from "zod"
import { login } from "@/modules/auth/auth.service"
import { enforceRateLimit, getClientIp } from "@/libs/rate-limit"

interface LoginResult {
  error?: string
}

const loginSchema = z.object({
  orgSlug: z.string().min(1, { message: "Informe o identificador da organização." }).max(100),
  email: z.string().email({ message: "E-mail inválido." }).max(255),
  password: z.string().min(1, { message: "Informe a senha." }).max(128),
})

export async function loginAction(input: {
  orgSlug: string
  email: string
  password: string
}): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { error: "Dados inválidos." }

  const ip = await getClientIp()
  const rateLimitError = await enforceRateLimit(`rl:login:${ip}`, 10, 900)
  if (rateLimitError !== null) return { error: rateLimitError }

  try {
    await login(parsed.data)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
