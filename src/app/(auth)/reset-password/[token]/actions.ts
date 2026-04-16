"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { resetPassword } from "@/modules/auth/auth.service"


export async function resetPasswordAction(input: {
  token: string
  newPassword: string
}): Promise<ActionResult> {
  try {
    await resetPassword(input.token, input.newPassword)
    redirect("/login?reset=success")
  } catch (error) {
    if (isRedirectError(error)) throw error
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
