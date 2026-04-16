"use server"
import { revalidatePath } from "next/cache"
import { getSession } from "@/modules/auth/session"
import { createDept, updateDept, removeDept } from "@/modules/departments/department.service"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"


export async function createDepartmentAction(name: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!name.trim()) return { error: "Nome é obrigatório." }
  try {
    await createDept(session.tenantId, { name: name.trim() })
    revalidatePath("/departments")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function renameDepartmentAction(departmentId: string, name: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  if (!name.trim()) return { error: "Nome é obrigatório." }
  try {
    await updateDept(session.tenantId, departmentId, { name: name.trim() })
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
