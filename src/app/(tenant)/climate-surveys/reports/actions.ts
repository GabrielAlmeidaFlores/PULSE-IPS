"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { duplicateClimateSurveyConfig } from "@/modules/climate-surveys/climate-survey-config.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

interface DuplicateClimateSurveyConfigResult extends ActionResult {
  configId?: string
}

export async function duplicateClimateSurveyConfigAction(configId: string): Promise<DuplicateClimateSurveyConfigResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) {
    return { error: "Recurso não disponível no plano." }
  }

  const parsed = z.string().uuid().safeParse(configId)
  if (!parsed.success) return { error: "Registro inválido." }

  try {
    const newConfigId = await duplicateClimateSurveyConfig(session.tenantId, parsed.data)
    revalidatePath("/climate-surveys/reports")
    revalidatePath("/climate-surveys/configure")
    return { configId: newConfigId }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
