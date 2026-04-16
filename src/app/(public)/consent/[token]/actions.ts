"use server"

import type { ActionResult } from "@/libs/utils/action-result"
import { recordAcceptance, recordRefusal } from "@/modules/consent/consent.service"


export async function acceptConsentAction(token: string): Promise<ActionResult> {
  try {
    await recordAcceptance(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}

export async function refuseConsentAction(token: string): Promise<ActionResult> {
  try {
    await recordRefusal(token)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
