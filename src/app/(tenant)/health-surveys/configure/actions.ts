"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { deactivateHealthSurveyConfig } from "@/modules/health-surveys/health-survey-config.service"

export async function deactivateHealthSurveyConfigAction(configId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsedConfigId = z.string().uuid().safeParse(configId)
  if (!parsedConfigId.success) return { error: "Pesquisa inválida." }

  try {
    await deactivateHealthSurveyConfig(session.tenantId, parsedConfigId.data)
    revalidatePath("/health-surveys/configure")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function deactivateHealthSurveyGroupAction(configIds: string[]): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsed = z.array(z.string().uuid()).min(1).safeParse(configIds)
  if (!parsed.success) return { error: "Pesquisa inválida." }

  try {
    await Promise.all(parsed.data.map((id) => deactivateHealthSurveyConfig(session.tenantId, id)))
    revalidatePath("/health-surveys/configure")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
