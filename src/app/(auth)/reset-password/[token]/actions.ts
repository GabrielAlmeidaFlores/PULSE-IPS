"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { resetPassword } from "@/modules/auth/auth.service"

const resetPasswordSchema = z.object({
  token: z.string().min(1).max(255),
  newPassword: z.string().min(8).max(128),
})

export async function resetPasswordAction(input: {
  token: string
  newPassword: string
}): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await resetPassword(parsed.data.token, parsed.data.newPassword)
    redirect("/login?reset=success")
  } catch (error) {
    if (isRedirectError(error)) throw error
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
