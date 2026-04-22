"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { scheduleDispatch, getSurveyConfigs } from "@/modules/surveys/survey.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

export async function scheduleAllDispatchesAction(scheduledAt: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const date = new Date(scheduledAt)
  if (isNaN(date.getTime())) return { error: "Data/hora inválida." }
  try {
    const configs = await getSurveyConfigs(session.tenantId)
    if (configs.length === 0) return { error: "Nenhuma pesquisa configurada." }
    await Promise.all(configs.map((c) => scheduleDispatch(session.tenantId, c.id, date)))
    revalidatePath("/surveys")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
