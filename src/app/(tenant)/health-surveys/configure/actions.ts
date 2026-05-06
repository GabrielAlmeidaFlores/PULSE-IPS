"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { deactivateHealthSurveyConfig } from "@/modules/health-surveys/health-survey-config.service"

export async function deactivateHealthSurveyConfigAction(configId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    await deactivateHealthSurveyConfig(session.tenantId, configId)
    revalidatePath("/health-surveys/configure")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
