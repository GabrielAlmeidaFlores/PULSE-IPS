import ExcelJS from "exceljs"
import { AppError } from "@/libs/errors/app-error"
import { importRowSchema } from "@/modules/employees/employee.schema"
import { createEmployee } from "@/modules/employees/employee.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"
import type { ImportPreview, ImportPreviewItem, ImportResult } from "@/modules/employees/employee.types"

function parseCellTimeValue(val: unknown): string | undefined {
  if (val instanceof Date) {
    const h = val.getUTCHours().toString().padStart(2, "0")
    const m = val.getUTCMinutes().toString().padStart(2, "0")
    return `${h}:${m}`
  }
  const str = val !== null && val !== undefined ? String(val).trim() : ""
  const match = /^(\d{1,2}):(\d{2})$/.exec(str)
  if (match) {
    return `${(match[1] ?? "0").padStart(2, "0")}:${match[2] ?? "00"}`
  }
  return undefined
}

function findColIndex(headers: Record<number, string>, keys: string[]): number | undefined {
  for (const [col, header] of Object.entries(headers)) {
    if (keys.some((k) => k.toLowerCase() === header.toLowerCase())) {
      return Number(col)
    }
  }
  return undefined
}

function assignImportPreviewOptionalFields(
  item: ImportPreviewItem,
  email: string | undefined,
  workStartTime: string | undefined,
  workEndTime: string | undefined,
): void {
  if (email !== undefined) item.email = email
  if (workStartTime !== undefined) item.workStartTime = workStartTime
  if (workEndTime !== undefined) item.workEndTime = workEndTime
}

export async function parseImportPreview(buffer: ArrayBuffer, tenantId: string): Promise<ImportPreview> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) throw new AppError("SHEET_NOT_FOUND", "Nenhuma planilha encontrada no arquivo.")

  const departments = await findActiveDepartmentsByTenant(tenantId)
  const validDepartmentNames = new Set(departments.map((d) => d.name.toLowerCase()))

  const headerRow = sheet.getRow(1)
  const headers: Record<number, string> = {}
  headerRow.eachCell((cell, col) => {
    headers[col] = String(cell.value ?? "").trim()
  })

  const items: ImportPreviewItem[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const get = (keys: string[]): string => {
      const col = findColIndex(headers, keys)
      if (col === undefined) return ""
      const val = row.getCell(col).value
      return val !== null && val !== undefined ? String(val).trim() : ""
    }

    const getTime = (keys: string[]): string | undefined => {
      const col = findColIndex(headers, keys)
      if (col === undefined) return undefined
      return parseCellTimeValue(row.getCell(col).value)
    }

    const rawEmail = get(["email", "e-mail"]) || undefined
    const rawWorkStartTime = getTime(["hora início", "hora inicio"])
    const rawWorkEndTime = getTime(["hora fim"])

    const rawItem = {
      name: get(["nome", "nome completo", "name"]),
      phone: get(["telefone", "mensagem", "phone"]),
      departmentName: get(["setor", "departamento", "departmentName"]),
      ...(rawEmail !== undefined ? { email: rawEmail } : {}),
      ...(rawWorkStartTime !== undefined ? { workStartTime: rawWorkStartTime } : {}),
      ...(rawWorkEndTime !== undefined ? { workEndTime: rawWorkEndTime } : {}),
    }

    const result = importRowSchema.safeParse(rawItem)
    if (!result.success) {
      const item: ImportPreviewItem = {
        row: rowNumber,
        name: rawItem.name,
        phone: rawItem.phone,
        departmentName: rawItem.departmentName,
        valid: false,
        errors: result.error.issues.map((e) => e.message),
      }
      assignImportPreviewOptionalFields(item, rawEmail, rawWorkStartTime, rawWorkEndTime)
      items.push(item)
      return
    }

    const departmentExists = validDepartmentNames.has(result.data.departmentName.toLowerCase())
    if (!departmentExists) {
      const item: ImportPreviewItem = {
        row: rowNumber,
        name: result.data.name,
        phone: result.data.phone,
        departmentName: result.data.departmentName,
        valid: false,
        errors: [`Departamento "${result.data.departmentName}" não encontrado`],
      }
      assignImportPreviewOptionalFields(item, result.data.email, result.data.workStartTime, result.data.workEndTime)
      items.push(item)
      return
    }

    const item: ImportPreviewItem = {
      row: rowNumber,
      name: result.data.name,
      phone: result.data.phone,
      departmentName: result.data.departmentName,
      valid: true,
      errors: [],
    }
    assignImportPreviewOptionalFields(item, result.data.email, result.data.workStartTime, result.data.workEndTime)
    items.push(item)
  })

  return {
    valid: items.filter((i) => i.valid).length,
    invalid: items.filter((i) => !i.valid).length,
    items,
  }
}

export async function executeImport(
  tenantId: string,
  buffer: ArrayBuffer,
): Promise<ImportResult> {
  const preview = await parseImportPreview(buffer, tenantId)
  const departments = await findActiveDepartmentsByTenant(tenantId)
  const deptMap = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]))

  let created = 0
  const errors: { row: number; error: string }[] = []

  for (const item of preview.items) {
    if (!item.valid) {
      errors.push({ row: item.row, error: item.errors.join(", ") })
      continue
    }

    const departmentId = deptMap.get(item.departmentName.toLowerCase())
    if (!departmentId) {
      errors.push({ row: item.row, error: `Departamento "${item.departmentName}" não encontrado` })
      continue
    }

    try {
      await createEmployee(tenantId, {
        name: item.name,
        phone: item.phone,
        departmentId,
        ...(item.email !== undefined ? { email: item.email } : {}),
        ...(item.workStartTime !== undefined ? { workStartTime: item.workStartTime } : {}),
        ...(item.workEndTime !== undefined ? { workEndTime: item.workEndTime } : {}),
      })
      created++
    } catch (error) {
      errors.push({ row: item.row, error: error instanceof Error ? error.message : String(error) })
    }
  }

  return { created, failed: errors.length, errors }
}
