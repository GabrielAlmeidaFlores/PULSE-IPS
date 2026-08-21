"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { deactivateClimateSurveyConfig } from "@/modules/climate-surveys/climate-survey-config.service"

export async function deactivateClimateSurveyConfigAction(configId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsedConfigId = z.string().uuid().safeParse(configId)
  if (!parsedConfigId.success) return { error: "Pesquisa inválida." }

  try {
    await deactivateClimateSurveyConfig(session.tenantId, parsedConfigId.data)
    revalidatePath("/climate-surveys/configure")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
