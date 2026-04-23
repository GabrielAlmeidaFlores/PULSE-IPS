"use server"
import { z } from "zod"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { createPlan, createPlanWithTasks } from "@/modules/action-plans/action-plan.service"
import { convertActionPlanSuggestion } from "@/modules/action-plans/action-plan-suggestion.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const createPlanSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]),
})

const createActionPlanFromSuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
  title: z.string().min(1).max(255).trim(),
  description: z.string().min(1).max(2000),
  priority: z.enum(["low", "medium", "high"]),
  tasks: z.array(z.string().min(1).max(500)).min(1).max(50),
})

export async function createActionPlanAction(input: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = createPlanSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    const plan = await createPlan(session.tenantId, {
      title: parsed.data.title,
      description: parsed.data.description?.trim() ?? undefined,
      priority: parsed.data.priority,
    })
    revalidatePath("/action-plans")
    redirect(`/action-plans/${plan.id}`)
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function createActionPlanFromSuggestionAction(input: unknown): Promise<ActionResult & { id?: string }> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = createActionPlanFromSuggestionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    const plan = await createPlanWithTasks(
      session.tenantId,
      { title: parsed.data.title, description: parsed.data.description, priority: parsed.data.priority },
      parsed.data.tasks,
    )
    await convertActionPlanSuggestion(session.tenantId, parsed.data.suggestionId, plan.id)
    revalidatePath("/action-plans")
    return { id: plan.id }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

