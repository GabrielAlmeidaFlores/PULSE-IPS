"use server"

import { z } from "zod"
import type { ActionResult } from "@/libs/utils/action-result"
import { acceptInvite } from "@/modules/auth/invite.service"

const acceptInviteSchema = z.object({
  token: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).trim(),
})

export async function acceptInviteAction(
  token: string,
  password: string,
  name: string,
): Promise<ActionResult> {
  const parsed = acceptInviteSchema.safeParse({ token, password, name })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await acceptInvite(parsed.data.token, parsed.data.password, parsed.data.name)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
