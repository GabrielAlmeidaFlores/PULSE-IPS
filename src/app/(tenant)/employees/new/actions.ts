"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { createNewEmployee } from "@/modules/employees/employee.service"
import type { CreateEmployeeInput } from "@/modules/employees/employee.types"


export async function createEmployeeAction(
  input: CreateEmployeeInput,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  try {
    await createNewEmployee(session.tenantId, input)
    revalidatePath("/employees")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
