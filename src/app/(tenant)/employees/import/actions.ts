"use server"

import { AppError } from "@/libs/errors/app-error"
import { getSession } from "@/modules/auth/session"
import { executeImport } from "@/modules/employees/employee-import.service"

interface ImportResult {
  error?: string
  created?: number
  failed?: number
  errors?: { row: number; error: string }[]
}

export async function importEmployeesAction(formData: FormData): Promise<ImportResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const file = formData.get("file") as File | null
  if (!file) return { error: "Nenhum arquivo selecionado." }
  try {
    const buffer = await file.arrayBuffer()
    const result = await executeImport(session.tenantId, buffer)
    return {
      created: result.created,
      failed: result.failed,
      errors: result.errors,
    }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}
