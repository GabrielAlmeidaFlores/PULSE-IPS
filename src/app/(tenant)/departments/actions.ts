"use server"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { createDept, updateDept, removeDept } from "@/modules/departments/department.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"

interface DeptFormData {
  name: string
  workStartTime?: string
  workEndTime?: string
  workDays?: number[]
}

export async function createDepartmentAction(data: DeptFormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!data.name.trim()) return { error: "Nome é obrigatório." }
  try {
    await createDept(session.tenantId, {
      name: data.name.trim(),
      workStartTime: data.workStartTime !== undefined && data.workStartTime !== "" ? data.workStartTime : "09:00",
      workEndTime: data.workEndTime !== undefined && data.workEndTime !== "" ? data.workEndTime : "18:00",
      workDays: data.workDays ?? [1, 2, 3, 4, 5],
    })
    revalidatePath("/departments")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function updateDepartmentAction(departmentId: string, data: DeptFormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!data.name.trim()) return { error: "Nome é obrigatório." }
  try {
    await updateDept(session.tenantId, departmentId, {
      name: data.name.trim(),
      ...(data.workStartTime ? { workStartTime: data.workStartTime } : {}),
      ...(data.workEndTime ? { workEndTime: data.workEndTime } : {}),
      ...(data.workDays && data.workDays.length > 0 ? { workDays: data.workDays } : {}),
    })
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
  try {
    await removeDept(session.tenantId, departmentId)
    revalidatePath("/departments")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
