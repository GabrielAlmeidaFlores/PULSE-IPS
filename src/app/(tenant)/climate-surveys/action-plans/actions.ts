"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import {
  createClimateSurveyActionPlan,
  updateClimateSurveyActionPlan,
  updateClimateSurveyActionPlanStatus,
} from "@/modules/climate-surveys/climate-survey-action-plan.service"

const climateSurveyActionStatusSchema = z.enum(["open", "in_progress", "completed"])
const climateSurveyActionPrioritySchema = z.enum(["low", "medium", "high"])
const climateSurveyTopicKeySchema = z.string().trim().min(1).max(60)

const createClimateSurveyActionSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(255),
  description: z.string().trim().max(5000).optional(),
  priority: climateSurveyActionPrioritySchema,
  status: climateSurveyActionStatusSchema.optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  dimension: climateSurveyTopicKeySchema,
  climateSurveyDispatchId: z.string().uuid().optional(),
})

const updateClimateSurveyActionSchema = z.object({
  planId: z.string().uuid(),
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  priority: climateSurveyActionPrioritySchema.optional(),
  status: climateSurveyActionStatusSchema.optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dimension: climateSurveyTopicKeySchema.nullable().optional(),
})

async function assertClimateActionPlanAccess(tenantId: string): Promise<string | null> {
  if (!(await hasTenantPlanFeature(tenantId, "climate_surveys"))) {
    return "Pesquisa de clima não está disponível no seu plano atual."
  }
  if (!(await hasTenantPlanFeature(tenantId, "action_plans"))) {
    return "Plano de ação não está disponível no seu plano atual."
  }
  return null
}

function parseOptionalDueDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value.trim().length === 0) return null
  const parsed = new Date(`${value}T12:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("INVALID_DUE_DATE", "Prazo inválido.")
  }
  return parsed
}

export async function createClimateSurveyActionPlanItemAction(
  input: z.infer<typeof createClimateSurveyActionSchema>,
): Promise<ActionResult & { planId?: string }> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const accessError = await assertClimateActionPlanAccess(session.tenantId)
  if (accessError !== null) return { error: accessError }

  const parsed = createClimateSurveyActionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    const dueDate = parseOptionalDueDate(parsed.data.dueDate)
    const plan = await createClimateSurveyActionPlan(
      session.tenantId,
      {
        title: parsed.data.title,
        priority: parsed.data.priority,
        ...(parsed.data.description !== undefined && parsed.data.description.length > 0
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(dueDate !== undefined && dueDate !== null ? { dueDate } : {}),
        ...(parsed.data.assigneeId !== undefined ? { assigneeId: parsed.data.assigneeId } : {}),
        ...(parsed.data.dimension !== undefined ? { dimension: parsed.data.dimension } : {}),
        ...(parsed.data.climateSurveyDispatchId !== undefined
          ? { climateSurveyDispatchId: parsed.data.climateSurveyDispatchId }
          : {}),
      },
      session.userId,
    )
    revalidatePath("/climate-surveys/action-plans")
    return { planId: plan.id }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function updateClimateSurveyActionPlanItemAction(
  input: z.infer<typeof updateClimateSurveyActionSchema>,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const accessError = await assertClimateActionPlanAccess(session.tenantId)
  if (accessError !== null) return { error: accessError }

  const parsed = updateClimateSurveyActionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    const dueDate = parseOptionalDueDate(parsed.data.dueDate)
    await updateClimateSurveyActionPlan(
      session.tenantId,
      parsed.data.planId,
      {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(parsed.data.assigneeId !== undefined ? { assigneeId: parsed.data.assigneeId } : {}),
        ...(parsed.data.dimension !== undefined ? { dimension: parsed.data.dimension } : {}),
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

export async function updateClimateSurveyActionPlanStatusAction(
  planId: string,
  status: string,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const accessError = await assertClimateActionPlanAccess(session.tenantId)
  if (accessError !== null) return { error: accessError }

  const parsedId = z.string().uuid().safeParse(planId)
  if (!parsedId.success) return { error: "Ação inválida." }

  const parsedStatus = climateSurveyActionStatusSchema.safeParse(status)
  if (!parsedStatus.success) return { error: "Status inválido." }

  try {
    await updateClimateSurveyActionPlanStatus(session.tenantId, parsedId.data, parsedStatus.data, session.userId)
    revalidatePath("/climate-surveys/action-plans")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
