"use server"

import { z } from "zod"
import { superAdminLogin } from "@/modules/auth/auth.service"

interface LoginResult {
  error?: string
}

const superAdminLoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
})

export async function superAdminLoginAction(input: {
  email: string
  password: string
}): Promise<LoginResult> {
  const parsed = superAdminLoginSchema.safeParse(input)
  if (!parsed.success) return { error: "E-mail ou senha inválidos." }
  try {
    await superAdminLogin(parsed.data)
    return {}
  } catch {
    return { error: "E-mail ou senha inválidos." }
  }
}
