"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/libs/errors/app-error"
import { getSession } from "@/modules/auth/session"
import { executeImport, parseImportPreview } from "@/modules/employees/employee-import.service"
import { createNewEmployee } from "@/modules/employees/employee.service"
import { getActiveDepartments } from "@/modules/departments/department.service"
import { importRowSchema } from "@/modules/employees/employee.schema"
import type { ImportPreview, ImportPreviewItem } from "@/modules/employees/employee.types"

const IMPORT_ALLOWED_EXTENSIONS = new Set(["xlsx", "xls"])
const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

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
  if (file.size > IMPORT_MAX_FILE_SIZE_BYTES) return { error: "Arquivo muito grande (máx. 5 MB)." }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase()
  if (!IMPORT_ALLOWED_EXTENSIONS.has(ext)) return { error: "Apenas arquivos .xlsx e .xls são suportados." }

  try {
    const buffer = await file.arrayBuffer()
    const preview = await parseImportPreview(buffer, session.tenantId)
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
    const rowParsed = importRowSchema.safeParse(item)
    if (!rowParsed.success) {
      errors.push({ row: item.row, error: rowParsed.error.issues[0]?.message ?? "Dados inválidos." })
      continue
    }
    const departmentId = deptMap.get(rowParsed.data.departmentName.toLowerCase())
    if (!departmentId) {
      errors.push({ row: item.row, error: `Departamento "${rowParsed.data.departmentName}" não encontrado` })
      continue
    }
    try {
      await createNewEmployee(session.tenantId, {
        name: rowParsed.data.name,
        phone: rowParsed.data.phone,
        departmentId,
        ...(rowParsed.data.email !== undefined ? { email: rowParsed.data.email } : {}),
        ...(rowParsed.data.workStartTime !== undefined ? { workStartTime: rowParsed.data.workStartTime } : {}),
        ...(rowParsed.data.workEndTime !== undefined ? { workEndTime: rowParsed.data.workEndTime } : {}),
      }, session.userId)
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
  if (file.size > IMPORT_MAX_FILE_SIZE_BYTES) return { error: "Arquivo muito grande (máx. 5 MB)." }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase()
  if (!IMPORT_ALLOWED_EXTENSIONS.has(ext)) return { error: "Apenas arquivos .xlsx e .xls são suportados." }

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
