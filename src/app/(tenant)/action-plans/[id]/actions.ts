"use server"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { completeTask, addTask, updatePlan } from "@/modules/action-plans/action-plan.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"


export async function completeTaskAction(taskId: string, planId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    await completeTask(session.tenantId, taskId)
    revalidatePath(`/action-plans/${planId}`)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function addTaskAction(planId: string, title: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!title.trim()) return { error: "Título é obrigatório." }
  try {
    await addTask(session.tenantId, planId, { title: title.trim() })
    revalidatePath(`/action-plans/${planId}`)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function completePlanAction(planId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    await updatePlan(session.tenantId, planId, { status: "completed" })
    revalidatePath(`/action-plans/${planId}`)
    revalidatePath("/action-plans")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
