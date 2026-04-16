"use server"

import type { ActionResult } from "@/libs/utils/action-result"
import { acceptInvite } from "@/modules/auth/invite.service"


export async function acceptInviteAction(
  token: string,
  password: string,
  name: string,
): Promise<ActionResult> {
  try {
    await acceptInvite(token, password, name)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
