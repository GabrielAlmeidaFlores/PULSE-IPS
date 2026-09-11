"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import { logger } from "@/libs/logger"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import {
  generateActionPlanFromWorkforceInsight,
  generateWorkforceInsightsWithAI,
} from "@/modules/workforce/workforce-insights.service"

const competenciaSchema = z.string().regex(/^\d{4}-\d{2}$/, "Competência inválida.").optional()

export interface CreateActionPlanFromInsightResult extends ActionResult {
  planId?: string
}

export async function generateWorkforceInsightsAction(competencia?: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsed = competenciaSchema.safeParse(competencia)
  if (!parsed.success) return { error: "Competência inválida." }

  try {
    await generateWorkforceInsightsWithAI(session.tenantId, parsed.data)
    revalidatePath("/workforce/insights")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    logger.error({ err }, "falha ao gerar análise de equipe com IA")
    return { error: "Não foi possível gerar a análise. Tente novamente." }
  }
}

export async function createActionPlanFromInsightAction(
  insightId: string,
): Promise<CreateActionPlanFromInsightResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsedId = z.string().uuid().safeParse(insightId)
  if (!parsedId.success) return { error: "Insight inválido." }

  try {
    const plan = await generateActionPlanFromWorkforceInsight(session.tenantId, parsedId.data, session.userId)
    revalidatePath("/action-plans")
    return { planId: plan.id }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    logger.error({ err }, "falha ao gerar plano de ação a partir de insight")
    return { error: "Não foi possível gerar o plano de ação. Tente novamente." }
  }
}
