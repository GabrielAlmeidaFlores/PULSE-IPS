"use server"

import type { ActionResult } from "@/libs/utils/action-result"
import { requestPasswordReset } from "@/modules/auth/auth.service"


export async function forgotPasswordAction(input: {
  email: string
  orgSlug: string
}): Promise<ActionResult> {
  try {
    await requestPasswordReset(input.email, input.orgSlug)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
