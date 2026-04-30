"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { updateExistingEmployee, deactivateExistingEmployee } from "@/modules/employees/employee.service"
import { updateEmployeeSchema } from "@/modules/employees/employee.schema"

const employeeIdSchema = z.string().uuid()

export async function updateEmployeeAction(
  employeeId: string,
  input: unknown,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const idParsed = employeeIdSchema.safeParse(employeeId)
  if (!idParsed.success) return { error: "ID inválido." }
  const parsed = updateEmployeeSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await updateExistingEmployee(session.tenantId, idParsed.data, parsed.data)
    revalidatePath("/employees")
    revalidatePath(`/employees/${idParsed.data}`)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function deactivateEmployeeAction(employeeId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const idParsed = employeeIdSchema.safeParse(employeeId)
  if (!idParsed.success) return { error: "ID inválido." }
  try {
    await deactivateExistingEmployee(session.tenantId, idParsed.data, session.userId)
    revalidatePath("/employees")
    revalidatePath(`/employees/${idParsed.data}`)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
