"use server"

import { z } from "zod"
import { enforceRateLimit, getClientIp } from "@/libs/rate-limit"
import { superAdminLogin } from "@/modules/auth/auth.service"

interface LoginResult {
  error?: string
}

const superAdminLoginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }).max(255),
  password: z.string().min(1, { message: "Informe a senha." }).max(128),
})

export async function superAdminLoginAction(input: {
  email: string
  password: string
}): Promise<LoginResult> {
  const ip = await getClientIp()
  const rateLimitError = await enforceRateLimit(`rl:sa-login:ip:${ip}`, 10, 900)
  if (rateLimitError !== null) {
    return { error: rateLimitError }
  }

  const parsed = superAdminLoginSchema.safeParse(input)
  if (!parsed.success) return { error: "E-mail ou senha inválidos." }
  try {
    await superAdminLogin(parsed.data)
    return {}
  } catch {
    return { error: "E-mail ou senha inválidos." }
  }
}
