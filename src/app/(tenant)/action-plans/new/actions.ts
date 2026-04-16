"use server"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { createPlan } from "@/modules/action-plans/action-plan.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"


export async function createActionPlanAction(input: {
  title: string
  description?: string
  priority: "low" | "medium" | "high"
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!input.title.trim()) return { error: "Título é obrigatório." }
  try {
    const plan = await createPlan(session.tenantId, {
      title: input.title.trim(),
      description: input.description?.trim() ?? undefined,
      priority: input.priority,
    })
    revalidatePath("/action-plans")
    redirect(`/action-plans/${plan.id}`)
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
