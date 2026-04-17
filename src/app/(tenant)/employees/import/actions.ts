"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import { getSession } from "@/modules/auth/session"
import { executeImport, parseImportPreview } from "@/modules/employees/employee-import.service"
import { createNewEmployee } from "@/modules/employees/employee.service"
import { getActiveDepartments } from "@/modules/departments/department.service"
import type { ImportPreview, ImportPreviewItem } from "@/modules/employees/employee.types"

interface ImportResult {
  error?: string
  created?: number
  failed?: number
  errors?: { row: number; error: string }[]
}

interface PreviewResult {
  error?: string
  preview?: ImportPreview
}

export async function previewImportAction(formData: FormData): Promise<PreviewResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const file = formData.get("file") as File | null
  if (!file) return { error: "Nenhum arquivo selecionado." }
  try {
    const buffer = await file.arrayBuffer()
    const preview = await parseImportPreview(buffer)
    return { preview }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message }
    throw err
  }
}

export async function confirmImportAction(validItems: ImportPreviewItem[]): Promise<ImportResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const departments = await getActiveDepartments(session.tenantId)
  const deptMap = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]))

  let created = 0
  const errors: { row: number; error: string }[] = []

  for (const item of validItems) {
    const departmentId = deptMap.get(item.departmentName.toLowerCase())
    if (!departmentId) {
      errors.push({ row: item.row, error: `Departamento "${item.departmentName}" não encontrado` })
      continue
    }
    try {
      await createNewEmployee(session.tenantId, {
        name: item.name,
        phone: item.phone,
        departmentId,
        ...(item.email !== undefined ? { email: item.email } : {}),
      })
      created++
    } catch (err) {
      errors.push({ row: item.row, error: err instanceof Error ? err.message : String(err) })
    }
  }

  revalidatePath("/employees")
  return { created, failed: errors.length, errors }
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
