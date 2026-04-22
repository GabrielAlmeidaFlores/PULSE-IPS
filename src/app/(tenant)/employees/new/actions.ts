"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import type { ActionResult } from "@/libs/utils/action-result"
import { getSession } from "@/modules/auth/session"
import { createNewEmployee } from "@/modules/employees/employee.service"
import { createEmployeeSchema } from "@/modules/employees/employee.schema"


export async function createEmployeeAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }
  const parsed = createEmployeeSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  try {
    await createNewEmployee(session.tenantId, parsed.data, session.userId)
    revalidatePath("/employees")
    return {}
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
