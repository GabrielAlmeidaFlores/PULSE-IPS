"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import {
  acceptClimateSurveyActionSuggestion,
  rejectClimateSurveyActionSuggestion,
} from "@/modules/climate-surveys/climate-survey-action-suggestion.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const acceptSchema = z.object({
  suggestionId: z.string().uuid(),
  what: z.string().trim().min(1, "Informe o que será feito.").max(255),
  why: z.string().trim().min(1, "Informe o porquê.").max(1000),
  who: z.string().trim().min(1, "Informe o responsável sugerido.").max(255),
  where: z.string().trim().min(1, "Informe onde.").max(255),
  when: z.string().trim().min(1, "Informe o prazo.").max(255),
  how: z.string().trim().min(1, "Informe como.").max(2000),
  cost: z.string().trim().max(255).optional(),
  dueDate: z.string().datetime().optional(),
})

export async function acceptClimateSurveyActionSuggestionAction(input: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!(await hasTenantPlanFeature(session.tenantId, "action_plans"))) {
    return { error: "Recurso não disponível no plano." }
  }

  const parsed = acceptSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    await acceptClimateSurveyActionSuggestion(
      session.tenantId,
      parsed.data.suggestionId,
      {
        what: parsed.data.what,
        why: parsed.data.why,
        who: parsed.data.who,
        where: parsed.data.where,
        when: parsed.data.when,
        how: parsed.data.how,
        ...(parsed.data.cost !== undefined ? { cost: parsed.data.cost } : {}),
        ...(parsed.data.dueDate !== undefined ? { dueDate: new Date(parsed.data.dueDate) } : {}),
      },
      session.userId,
    )
    revalidatePath("/climate-surveys/action-plans")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

const rejectSchema = z.object({
  suggestionId: z.string().uuid(),
  reason: z.string().trim().min(1, "Informe o motivo da recusa.").max(500),
})

export async function rejectClimateSurveyActionSuggestionAction(input: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!(await hasTenantPlanFeature(session.tenantId, "action_plans"))) {
    return { error: "Recurso não disponível no plano." }
  }

  const parsed = rejectSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    await rejectClimateSurveyActionSuggestion(session.tenantId, parsed.data.suggestionId, parsed.data.reason)
    revalidatePath("/climate-surveys/action-plans")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
