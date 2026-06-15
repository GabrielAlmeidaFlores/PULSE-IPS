import { Readable } from "stream"
import ExcelJS from "exceljs"
import { AppError } from "@/libs/errors/app-error"
import { importRowSchema } from "@/modules/employees/employee.schema"
import { createEmployee } from "@/modules/employees/employee.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"
import type { ImportPreview, ImportPreviewItem, ImportResult } from "@/modules/employees/employee.types"

const DAY_NAME_MAP: Record<string, number> = {
  dom: 0, domingo: 0,
  seg: 1, segunda: 1,
  ter: 2, terca: 2, "terça": 2,
  qua: 3, quarta: 3,
  qui: 4, quinta: 4,
  sex: 5, sexta: 5,
  sab: 6, "sáb": 6, sabado: 6, "sábado": 6,
}

interface WorkDaysParseResult {
  days: number[]
  errors: string[]
}

interface ScheduleParseResult {
  workStartTime?: string | undefined
  workEndTime?: string | undefined
  workDays?: number[] | undefined
  errors: string[]
}

function normalizeImportTimeInput(raw: string): string | null {
  const cleaned = raw.trim()
  if (/^\d{2}:\d{2}$/.test(cleaned)) return cleaned
  const colonMatch = /^(\d{1,2}):(\d{2})$/.exec(cleaned)
  if (colonMatch) {
    const h = colonMatch[1] ?? ""
    const m = colonMatch[2] ?? ""
    return `${h.padStart(2, "0")}:${m}`
  }
  const hMatch = /^(\d{1,2})[hH](\d{2})$/.exec(cleaned)
  if (hMatch) {
    const h = hMatch[1] ?? ""
    const m = hMatch[2] ?? ""
    return `${h.padStart(2, "0")}:${m}`
  }
  return null
}

function parseWorkDaysFromString(raw: string): WorkDaysParseResult {
  const parts = raw.split(",").map((p) => p.trim().toLowerCase()).filter((p) => p.length > 0)
  if (parts.length === 0) return { days: [], errors: [] }
  const days: number[] = []
  const errors: string[] = []
  for (const part of parts) {
    const num = Number(part)
    if (Number.isFinite(num) && Number.isInteger(num) && num >= 0 && num <= 6) {
      days.push(num)
      continue
    }
    const dayNum = DAY_NAME_MAP[part]
    if (dayNum !== undefined) {
      days.push(dayNum)
      continue
    }
    errors.push(`Dia inválido: "${part}"`)
  }
  return { days, errors }
}

function buildScheduleFromRawValues(rawStart: string, rawEnd: string, rawDays: string): ScheduleParseResult {
  const errors: string[] = []
  let workStartTime: string | undefined = undefined
  let workEndTime: string | undefined = undefined
  let workDays: number[] | undefined = undefined

  if (rawStart !== "") {
    const normalized = normalizeImportTimeInput(rawStart)
    if (normalized === null) {
      errors.push(`Horário de início inválido: "${rawStart}". Use o formato HH:MM.`)
    } else {
      workStartTime = normalized
    }
  }

  if (rawEnd !== "") {
    const normalized = normalizeImportTimeInput(rawEnd)
    if (normalized === null) {
      errors.push(`Horário de fim inválido: "${rawEnd}". Use o formato HH:MM.`)
    } else {
      workEndTime = normalized
    }
  }

  if (rawDays !== "") {
    const { days, errors: dayErrors } = parseWorkDaysFromString(rawDays)
    if (dayErrors.length > 0) {
      errors.push(...dayErrors)
    } else if (days.length > 0) {
      workDays = days
    }
  }

  return { workStartTime, workEndTime, workDays, errors }
}

type ScheduleFields = Pick<ImportPreviewItem, "workStartTime" | "workEndTime" | "workDays">

function buildScheduleOptionalFields(src: {
  workStartTime?: string | undefined
  workEndTime?: string | undefined
  workDays?: number[] | undefined
}): Partial<ScheduleFields> {
  const result: Partial<ScheduleFields> = {}
  if (src.workStartTime !== undefined) result.workStartTime = src.workStartTime
  if (src.workEndTime !== undefined) result.workEndTime = src.workEndTime
  if (src.workDays !== undefined) result.workDays = src.workDays
  return result
}

interface RawRowData {
  rowNumber: number
  rawName: string
  rawPhone: string
  rawDeptName: string
  rawEmail: string | undefined
  schedule: ScheduleParseResult
}

function resolvePreviewItem(raw: RawRowData, validDepartmentNames: Set<string>): ImportPreviewItem {
  const emailField = raw.rawEmail !== undefined ? { email: raw.rawEmail } : {}
  const schedFields = buildScheduleOptionalFields(raw.schedule)

  const rawItem = {
    name: raw.rawName,
    phone: raw.rawPhone,
    departmentName: raw.rawDeptName,
    ...emailField,
    ...schedFields,
  }

  const schemaResult = importRowSchema.safeParse(rawItem)

  if (raw.schedule.errors.length > 0 || !schemaResult.success) {
    const schemaErrors = schemaResult.success ? [] : schemaResult.error.issues.map((e) => e.message)
    return {
      row: raw.rowNumber,
      name: raw.rawName,
      phone: raw.rawPhone,
      departmentName: raw.rawDeptName,
      valid: false,
      errors: [...raw.schedule.errors, ...schemaErrors],
      ...emailField,
      ...schedFields,
    }
  }

  const { data } = schemaResult
  const dataEmailField = data.email !== undefined ? { email: data.email } : {}
  const dataSchedFields = buildScheduleOptionalFields(data)

  if (!validDepartmentNames.has(data.departmentName.toLowerCase())) {
    return {
      row: raw.rowNumber,
      name: data.name,
      phone: data.phone,
      departmentName: data.departmentName,
      valid: false,
      errors: [`Departamento "${data.departmentName}" não encontrado`],
      ...dataEmailField,
      ...dataSchedFields,
    }
  }

  return {
    row: raw.rowNumber,
    name: data.name,
    phone: data.phone,
    departmentName: data.departmentName,
    valid: true,
    errors: [],
    ...dataEmailField,
    ...dataSchedFields,
  }
}

async function loadWorksheetFromBuffer(buffer: ArrayBuffer, ext: string): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook()
  if (ext === "csv") {
    const text = Buffer.from(buffer).toString("utf-8").replace(/^\uFEFF/, "")
    const stream = Readable.from(Buffer.from(text, "utf-8"))
    return workbook.csv.read(stream)
  }
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new AppError("SHEET_NOT_FOUND", "Nenhuma planilha encontrada no arquivo.")
  return sheet
}

function getCellStringValue(row: ExcelJS.Row, headers: Record<number, string>, keys: string[]): string {
  for (const [col, header] of Object.entries(headers)) {
    if (keys.some((k) => k.toLowerCase() === header.toLowerCase())) {
      const val = row.getCell(Number(col)).value
      if (val === null || val === undefined) return ""
      if (val instanceof Date) {
        const hh = String(val.getUTCHours()).padStart(2, "0")
        const mm = String(val.getUTCMinutes()).padStart(2, "0")
        return `${hh}:${mm}`
      }
      return String(val).trim()
    }
  }
  return ""
}

export async function parseImportPreview(buffer: ArrayBuffer, tenantId: string, ext = "xlsx"): Promise<ImportPreview> {
  const sheet = await loadWorksheetFromBuffer(buffer, ext)

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

    const rawName = getCellStringValue(row, headers, ["name", "nome", "nome completo"])
    const rawPhone = getCellStringValue(row, headers, ["phone", "telefone", "mensagem"])
    const rawDeptName = getCellStringValue(row, headers, ["departmentname", "departamento", "setor"])

    if (rawName === "" && rawPhone === "" && rawDeptName === "") return

    const rawEmailRaw = getCellStringValue(row, headers, ["email", "e-mail"])
    const rawEmail = rawEmailRaw !== "" ? rawEmailRaw : undefined
    const rawStartTime = getCellStringValue(row, headers, ["hora inicio", "hora início", "workstarttime", "inicio"])
    const rawEndTime = getCellStringValue(row, headers, ["hora fim", "workendtime", "fim"])
    const rawWorkDays = getCellStringValue(row, headers, ["dias de trabalho", "dias", "workdays"])

    const schedule = buildScheduleFromRawValues(rawStartTime, rawEndTime, rawWorkDays)
    items.push(resolvePreviewItem({ rowNumber, rawName, rawPhone, rawDeptName, rawEmail, schedule }, validDepartmentNames))
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
  ext = "xlsx",
): Promise<ImportResult> {
  const preview = await parseImportPreview(buffer, tenantId, ext)
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
        ...(item.workDays !== undefined ? { workDays: item.workDays } : {}),
      })
      created++
    } catch (error) {
      errors.push({ row: item.row, error: error instanceof Error ? error.message : String(error) })
    }
  }

  return { created, failed: errors.length, errors }
}
