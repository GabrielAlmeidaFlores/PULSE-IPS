"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { assertOrgAdmin } from "@/libs/auth/permissions"
import { createDept, updateDept, removeDept } from "@/modules/departments/department.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

const TIME_REGEX = /^\d{2}:\d{2}$/

const deptFormSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  workStartTime: z.string().regex(TIME_REGEX).optional(),
  workEndTime: z.string().regex(TIME_REGEX).optional(),
  workDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
})

const deptIdSchema = z.string().uuid()

export async function createDepartmentAction(data: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = deptFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await createDept(session.tenantId, {
      name: parsed.data.name,
      workStartTime: parsed.data.workStartTime ?? "09:00",
      workEndTime: parsed.data.workEndTime ?? "18:00",
      workDays: parsed.data.workDays ?? [1, 2, 3, 4, 5],
    }, session.userId)
    revalidatePath("/departments")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function updateDepartmentAction(departmentId: string, data: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const idParsed = deptIdSchema.safeParse(departmentId)
  if (!idParsed.success) return { error: "ID inválido." }
  const parsed = deptFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await updateDept(session.tenantId, idParsed.data, {
      name: parsed.data.name,
      ...(parsed.data.workStartTime ? { workStartTime: parsed.data.workStartTime } : {}),
      ...(parsed.data.workEndTime ? { workEndTime: parsed.data.workEndTime } : {}),
      ...(parsed.data.workDays && parsed.data.workDays.length > 0 ? { workDays: parsed.data.workDays } : {}),
    }, session.userId)
    revalidatePath("/departments")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function deleteDepartmentAction(departmentId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  assertOrgAdmin(session)
  const idParsed = deptIdSchema.safeParse(departmentId)
  if (!idParsed.success) return { error: "ID inválido." }
  try {
    await removeDept(session.tenantId, idParsed.data, session.userId)
    revalidatePath("/departments")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
