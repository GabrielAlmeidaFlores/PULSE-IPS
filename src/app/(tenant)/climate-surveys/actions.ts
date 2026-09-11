"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { scheduleClimateSurveyDispatch } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { updateOrg } from "@/modules/organizations/organization.service"
import { assertOrgAdmin } from "@/libs/auth/permissions"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const scheduledAtSchema = z.string().datetime()

export async function scheduleClimateSurveyDispatchAction(configId: string, scheduledAt: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsedConfigId = z.string().uuid().safeParse(configId)
  if (!parsedConfigId.success) return { error: "Pesquisa inválida." }
  const parsedDate = scheduledAtSchema.safeParse(scheduledAt)
  if (!parsedDate.success) return { error: "Data/hora inválida." }
  try {
    await scheduleClimateSurveyDispatch(session.tenantId, parsedConfigId.data, new Date(parsedDate.data))
    revalidatePath("/climate-surveys")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

const minRespondentsPercentSchema = z.number().int().min(1).max(100)

export async function updateClimateSurveyDisplaySettingsAction(minRespondentsPercent: number): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  assertOrgAdmin(session)
  const parsed = minRespondentsPercentSchema.safeParse(minRespondentsPercent)
  if (!parsed.success) return { error: "O percentual deve estar entre 1 e 100." }
  try {
    await updateOrg(session.tenantId, { climateSurveyMinRespondentsPercent: parsed.data })
    revalidatePath("/climate-surveys", "layout")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
