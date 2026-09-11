"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import {
  createClimateSurveyTopic,
  deactivateClimateSurveyTopic,
  renameClimateSurveyTopic,
} from "@/modules/climate-surveys/climate-survey-topic.service"

async function assertClimateSurveyTopicManagementAccess(tenantId: string): Promise<string | null> {
  if (!(await hasTenantPlanFeature(tenantId, "climate_surveys"))) {
    return "Pesquisa de clima não está disponível no seu plano atual."
  }
  return null
}

export async function createClimateSurveyTopicAction(label: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const accessError = await assertClimateSurveyTopicManagementAccess(session.tenantId)
  if (accessError !== null) return { error: accessError }

  const parsed = z.string().trim().min(1, "Informe o nome do tópico.").max(100).safeParse(label)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nome de tópico inválido." }

  try {
    await createClimateSurveyTopic(session.tenantId, parsed.data)
    revalidatePath("/climate-surveys/configure")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function renameClimateSurveyTopicAction(topicId: string, label: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const accessError = await assertClimateSurveyTopicManagementAccess(session.tenantId)
  if (accessError !== null) return { error: accessError }

  const parsedId = z.string().uuid().safeParse(topicId)
  if (!parsedId.success) return { error: "Tópico inválido." }

  const parsedLabel = z.string().trim().min(1, "Informe o nome do tópico.").max(100).safeParse(label)
  if (!parsedLabel.success) return { error: parsedLabel.error.issues[0]?.message ?? "Nome de tópico inválido." }

  try {
    await renameClimateSurveyTopic(session.tenantId, parsedId.data, parsedLabel.data)
    revalidatePath("/climate-surveys/configure")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function deactivateClimateSurveyTopicAction(topicId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const accessError = await assertClimateSurveyTopicManagementAccess(session.tenantId)
  if (accessError !== null) return { error: accessError }

  const parsedId = z.string().uuid().safeParse(topicId)
  if (!parsedId.success) return { error: "Tópico inválido." }

  try {
    await deactivateClimateSurveyTopic(session.tenantId, parsedId.data)
    revalidatePath("/climate-surveys/configure")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
