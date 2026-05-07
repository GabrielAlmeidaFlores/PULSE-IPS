"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { scheduleHealthSurveyDispatch } from "@/modules/health-surveys/health-survey-dashboard.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const scheduledAtSchema = z.string().datetime()

export async function scheduleHealthSurveyDispatchAction(configId: string, scheduledAt: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsedConfigId = z.string().uuid().safeParse(configId)
  if (!parsedConfigId.success) return { error: "Pesquisa inválida." }
  const parsedDate = scheduledAtSchema.safeParse(scheduledAt)
  if (!parsedDate.success) return { error: "Data/hora inválida." }
  try {
    await scheduleHealthSurveyDispatch(session.tenantId, parsedConfigId.data, new Date(parsedDate.data))
    revalidatePath("/health-surveys")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
