"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { scheduleDispatch } from "@/modules/surveys/survey.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"


export async function scheduleDispatchAction(configId: string, scheduledAt: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const date = new Date(scheduledAt)
  if (isNaN(date.getTime())) return { error: "Data/hora inválida." }
  try {
    await scheduleDispatch(session.tenantId, configId, date)
    revalidatePath("/surveys")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
