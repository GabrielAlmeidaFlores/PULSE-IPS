"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { deactivateHealthSurveyConfig, getHealthSurveyConfigGroupByName } from "@/modules/health-surveys/health-survey-config.service"

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

export async function deactivateHealthSurveyGroupAction(groupName: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsedName = z.string().min(1).max(255).safeParse(groupName)
  if (!parsedName.success) return { error: "Nome da pesquisa inválido." }

  try {
    const siblings = await getHealthSurveyConfigGroupByName(session.tenantId, parsedName.data)
    if (siblings.length === 0) return { error: "Pesquisa não encontrada." }
    await Promise.all(siblings.map((c) => deactivateHealthSurveyConfig(session.tenantId, c.id)))
    revalidatePath("/health-surveys/configure")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
