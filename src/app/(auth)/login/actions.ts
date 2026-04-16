"use server"

import { login } from "@/modules/auth/auth.service"

interface LoginResult {
  error?: string
}

export async function loginAction(input: {
  orgSlug: string
  email: string
  password: string
}): Promise<LoginResult> {
  try {
    await login(input)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
