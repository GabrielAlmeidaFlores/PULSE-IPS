"use server"

import { superAdminLogin } from "@/modules/auth/auth.service"

interface LoginResult {
  error?: string
}

export async function superAdminLoginAction(input: {
  email: string
  password: string
}): Promise<LoginResult> {
  try {
    await superAdminLogin(input)
    return {}
  } catch {
    return { error: "E-mail ou senha inválidos." }
  }
}
