"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { triggerClimateSurveyReminderNow } from "@/modules/climate-surveys/climate-survey-adherence.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

interface TriggerClimateSurveyReminderResult extends ActionResult {
  sentCount?: number
}

export async function triggerClimateSurveyReminderNowAction(
  dispatchId: string,
): Promise<TriggerClimateSurveyReminderResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) {
    return { error: "Recurso não disponível no plano." }
  }

  const parsedId = z.string().uuid().safeParse(dispatchId)
  if (!parsedId.success) return { error: "Onda inválida." }

  try {
    const result = await triggerClimateSurveyReminderNow(session.tenantId, parsedId.data)
    revalidatePath("/climate-surveys/adherence")
    revalidatePath(`/climate-surveys/${parsedId.data}`)
    return { sentCount: result.sentCount }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
