"use server"

import { z } from "zod"
import type { ActionResult } from "@/libs/utils/action-result"
import { recordAcceptance, recordRefusal } from "@/modules/consent/consent.service"

const tokenSchema = z.string().min(1).max(255)

export async function acceptConsentAction(token: string): Promise<ActionResult> {
  const parsed = tokenSchema.safeParse(token)
  if (!parsed.success) return { error: "Token inválido." }
  try {
    await recordAcceptance(parsed.data)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}

export async function refuseConsentAction(token: string): Promise<ActionResult> {
  const parsed = tokenSchema.safeParse(token)
  if (!parsed.success) return { error: "Token inválido." }
  try {
    await recordRefusal(parsed.data)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ocorreu um erro inesperado." }
  }
}
