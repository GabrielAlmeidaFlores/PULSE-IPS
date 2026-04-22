"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { completeTask, addTask, updatePlan } from "@/modules/action-plans/action-plan.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const uuidSchema = z.string().uuid()

const addTaskSchema = z.object({
  planId: z.string().uuid(),
  title: z.string().min(1).max(500).trim(),
})

export async function completeTaskAction(taskId: string, planId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const taskParsed = uuidSchema.safeParse(taskId)
  if (!taskParsed.success) return { error: "ID inválido." }
  const planParsed = uuidSchema.safeParse(planId)
  if (!planParsed.success) return { error: "ID inválido." }
  try {
    await completeTask(session.tenantId, taskParsed.data)
    revalidatePath(`/action-plans/${planParsed.data}`)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function addTaskAction(planId: string, title: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = addTaskSchema.safeParse({ planId, title })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await addTask(session.tenantId, parsed.data.planId, { title: parsed.data.title })
    revalidatePath(`/action-plans/${parsed.data.planId}`)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function completePlanAction(planId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = uuidSchema.safeParse(planId)
  if (!parsed.success) return { error: "ID inválido." }
  try {
    await updatePlan(session.tenantId, parsed.data, { status: "completed" })
    revalidatePath(`/action-plans/${parsed.data}`)
    revalidatePath("/action-plans")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
