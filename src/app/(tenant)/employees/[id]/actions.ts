"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { updateExistingEmployee, deactivateExistingEmployee } from "@/modules/employees/employee.service"
import { sendConsentInvite } from "@/modules/consent/consent.service"
import type { UpdateEmployeeInput } from "@/modules/employees/employee.types"


export async function updateEmployeeAction(
  employeeId: string,
  input: UpdateEmployeeInput,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    await updateExistingEmployee(session.tenantId, employeeId, input)
    revalidatePath("/employees")
    revalidatePath(`/employees/${employeeId}`)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function deactivateEmployeeAction(employeeId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    await deactivateExistingEmployee(session.tenantId, employeeId)
    revalidatePath("/employees")
    revalidatePath(`/employees/${employeeId}`)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function sendConsentInviteAction(employeeId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    await sendConsentInvite(session.tenantId, employeeId)
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
