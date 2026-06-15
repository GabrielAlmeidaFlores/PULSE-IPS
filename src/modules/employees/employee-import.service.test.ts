import { describe, it, expect, vi, beforeEach } from "vitest"
import ExcelJS from "exceljs"
import { parseImportPreview, executeImport } from "@/modules/employees/employee-import.service"
import { createEmployee } from "@/modules/employees/employee.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"

vi.mock("@/modules/employees/employee.repository", () => ({ createEmployee: vi.fn() }))
vi.mock("@/modules/departments/department.repository", () => ({ findActiveDepartmentsByTenant: vi.fn() }))
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockCreateEmployee = vi.mocked(createEmployee)
const mockFindDepts = vi.mocked(findActiveDepartmentsByTenant)

const TENANT_ID = "tenant-1"
const PT_HEADERS = ["Nome", "Telefone", "Departamento"]
const EN_HEADERS = ["name", "phone", "departmentName"]
const VALID_PHONE = "+5511999999999"
const VALID_PHONE_2 = "+5511888888888"
const VALID_PHONE_3 = "+5511777777777"
const VALID_PHONE_4 = "+5511666666666"
const VALID_EMAIL = "ana@test.com"
const DEPT_NAME = "TI"
const DEPT_ID = "dept-ti"
const WORK_START_HEADER = "Hora Início"
const WORK_END_HEADER = "Hora Fim"
const WORK_START_TIME = "09:00"
const WORK_END_TIME = "18:00"
const EMAIL_ALREADY_EXISTS_ERROR = "E-mail já cadastrado"
const UNEXPECTED_STRING_ERROR = "erro de string inesperado"

type DeptRow = Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>[number]

const ALL_PREVIEW_DEPTS: DeptRow[] = [
  { id: DEPT_ID, name: "TI" } as DeptRow,
  { id: "dept-rh", name: "RH" } as DeptRow,
  { id: "dept-mkt", name: "Marketing" } as DeptRow,
]

async function makeBuffer(headers: string[], rows: (string | undefined)[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Dados")
  ws.addRow(headers)
  for (const row of rows) ws.addRow(row)
  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}

async function makeBufferWithDateTimeCells(
  name: string,
  phone: string,
  dept: string,
  workStartTimeDate: Date | undefined,
  workEndTimeDate: Date | undefined,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Dados")
  ws.addRow(["Nome", "Telefone", "Departamento", WORK_START_HEADER, WORK_END_HEADER])
  const dataRow = ws.addRow([name, phone, dept])
  if (workStartTimeDate !== undefined) dataRow.getCell(4).value = workStartTimeDate
  if (workEndTimeDate !== undefined) dataRow.getCell(5).value = workEndTimeDate
  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}

describe("parseImportPreview — header detection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindDepts.mockResolvedValue(ALL_PREVIEW_DEPTS)
  })

  it("detects 'Nome' header (case-insensitive)", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.name).toBe("Ana")
  })

  it("detects 'name' header (English lowercase)", async () => {
    const buf = await makeBuffer(EN_HEADERS, [["Carlos", VALID_PHONE_2, "RH"]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.name).toBe("Carlos")
  })

  it("detects 'Telefone' header for phone", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE_3, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.phone).toBe(VALID_PHONE_3)
  })

  it("detects 'phone' header (English)", async () => {
    const buf = await makeBuffer(EN_HEADERS, [["Ana", VALID_PHONE_4, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.phone).toBe(VALID_PHONE_4)
  })

  it("detects 'Departamento' header for departmentName", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, "Marketing"]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.departmentName).toBe("Marketing")
  })

  it("detects 'SETOR' header (uppercase) for departmentName", async () => {
    const buf = await makeBuffer(["Nome", "Telefone", "SETOR"], [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.departmentName).toBe(DEPT_NAME)
    expect(preview.items[0]?.valid).toBe(true)
  })

  it("reads optional email column with 'Email' header", async () => {
    const buf = await makeBuffer([...PT_HEADERS, "Email"], [["Ana", VALID_PHONE, DEPT_NAME, VALID_EMAIL]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.email).toBe(VALID_EMAIL)
  })

  it("reads optional email column with 'E-mail' header (with hyphen)", async () => {
    const buf = await makeBuffer([...PT_HEADERS, "E-mail"], [["Ana", VALID_PHONE, DEPT_NAME, VALID_EMAIL]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.email).toBe(VALID_EMAIL)
  })

  it("leaves email undefined when column is absent", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.email).toBeUndefined()
  })

  it("reads 'Hora Início' string cell as workStartTime", async () => {
    const buf = await makeBuffer(
      [...PT_HEADERS, WORK_START_HEADER, WORK_END_HEADER],
      [["Ana", VALID_PHONE, DEPT_NAME, WORK_START_TIME, WORK_END_TIME]],
    )
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.workStartTime).toBe(WORK_START_TIME)
    expect(preview.items[0]?.workEndTime).toBe(WORK_END_TIME)
  })

  it("pads single-digit hour in string time cell to two digits", async () => {
    const buf = await makeBuffer(
      [...PT_HEADERS, WORK_START_HEADER],
      [["Ana", VALID_PHONE, DEPT_NAME, "9:00"]],
    )
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.workStartTime).toBe(WORK_START_TIME)
  })

  it("reads Date-type time cell (ExcelJS type 4) for 'Hora Início'", async () => {
    const buf = await makeBufferWithDateTimeCells(
      "Ana", VALID_PHONE, DEPT_NAME,
      new Date("1899-12-30T09:00:00.000Z"),
      new Date("1899-12-30T18:30:00.000Z"),
    )
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.workStartTime).toBe(WORK_START_TIME)
    expect(preview.items[0]?.workEndTime).toBe("18:30")
  })

  it("leaves workStartTime and workEndTime undefined when columns are absent", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.workStartTime).toBeUndefined()
    expect(preview.items[0]?.workEndTime).toBeUndefined()
  })
})

describe("parseImportPreview — valid rows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindDepts.mockResolvedValue(ALL_PREVIEW_DEPTS)
  })

  it("marks row as valid when all required fields are present and department exists", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(true)
  })

  it("counts valid rows correctly", async () => {
    const buf = await makeBuffer(PT_HEADERS, [
      ["Ana", VALID_PHONE, DEPT_NAME],
      ["Bruno", VALID_PHONE_2, "RH"],
    ])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.valid).toBe(2)
  })

  it("trims leading and trailing whitespace from cell values", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["  Ana  ", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.name).toBe("Ana")
  })

  it("returns empty errors array for valid rows", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.errors).toEqual([])
  })

  it("includes correct row number (data starts at row 2)", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.row).toBe(2)
  })

  it("preserves workStartTime and workEndTime on valid items", async () => {
    const buf = await makeBuffer(
      [...PT_HEADERS, WORK_START_HEADER, WORK_END_HEADER],
      [["Ana", VALID_PHONE, DEPT_NAME, WORK_START_TIME, WORK_END_TIME]],
    )
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(true)
    expect(preview.items[0]?.workStartTime).toBe(WORK_START_TIME)
    expect(preview.items[0]?.workEndTime).toBe(WORK_END_TIME)
  })
})

describe("parseImportPreview — invalid rows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindDepts.mockResolvedValue(ALL_PREVIEW_DEPTS)
  })

  it("marks row as invalid when name is missing", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(false)
  })

  it("marks row as invalid when phone is missing", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", "", DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(false)
  })

  it("marks row as invalid when departmentName is missing", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, ""]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(false)
  })

  it("marks row as invalid when department does not exist in the database", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, "Inexistente"]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(false)
    expect(preview.items[0]?.errors[0]).toMatch(/Inexistente/)
  })

  it("sets email on invalid item when schema validation fails but email is present", async () => {
    const buf = await makeBuffer(
      [...PT_HEADERS, "Email"],
      [["Ana", "", DEPT_NAME, VALID_EMAIL]],
    )
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(false)
    expect(preview.items[0]?.email).toBe(VALID_EMAIL)
  })

  it("sets email on invalid item when department is not found but email is present", async () => {
    const buf = await makeBuffer(
      [...PT_HEADERS, "Email"],
      [["Ana", VALID_PHONE, "Inexistente", VALID_EMAIL]],
    )
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(false)
    expect(preview.items[0]?.email).toBe(VALID_EMAIL)
  })

  it("preserves workStartTime on invalid item (schema failure)", async () => {
    const buf = await makeBuffer(
      [...PT_HEADERS, WORK_START_HEADER],
      [["", VALID_PHONE, DEPT_NAME, WORK_START_TIME]],
    )
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(false)
    expect(preview.items[0]?.workStartTime).toBe(WORK_START_TIME)
  })

  it("preserves workStartTime on invalid item (department not found)", async () => {
    const buf = await makeBuffer(
      [...PT_HEADERS, WORK_START_HEADER],
      [["Ana", VALID_PHONE, "Inexistente", WORK_START_TIME]],
    )
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.valid).toBe(false)
    expect(preview.items[0]?.workStartTime).toBe(WORK_START_TIME)
  })

  it("populates errors array with messages for invalid rows", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.items[0]?.errors.length).toBeGreaterThan(0)
  })

  it("counts invalid rows correctly", async () => {
    const buf = await makeBuffer(PT_HEADERS, [
      ["Ana", VALID_PHONE, DEPT_NAME],
      ["", "", ""],
    ])
    const preview = await parseImportPreview(buf, TENANT_ID)
    expect(preview.invalid).toBe(1)
  })

  it("throws SHEET_NOT_FOUND when workbook has no sheets", async () => {
    const wb = new ExcelJS.Workbook()
    const buf = await wb.xlsx.writeBuffer() as ArrayBuffer
    await expect(parseImportPreview(buf, TENANT_ID)).rejects.toMatchObject({ code: "SHEET_NOT_FOUND" })
  })
})

describe("executeImport — department resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindDepts.mockResolvedValue([
      { id: DEPT_ID, name: DEPT_NAME } as Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>[number],
    ])
    mockCreateEmployee.mockResolvedValue({} as Awaited<ReturnType<typeof createEmployee>>)
  })

  it("resolves department by name (case-insensitive)", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, "ti"]])
    await executeImport(TENANT_ID, buf)
    expect(mockCreateEmployee).toHaveBeenCalledWith(TENANT_ID, expect.objectContaining({ departmentId: DEPT_ID }))
  })

  it("records an error when department name not found", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, "Inexistente"]])
    const result = await executeImport(TENANT_ID, buf)
    expect(result.failed).toBe(1)
  })

  it("records an error when department existed in preview but was removed before import (race condition)", async () => {
    mockFindDepts
      .mockResolvedValueOnce([{ id: DEPT_ID, name: DEPT_NAME } as DeptRow])
      .mockResolvedValueOnce([])

    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const result = await executeImport(TENANT_ID, buf)

    expect(result.failed).toBe(1)
    expect(result.errors[0]?.error).toMatch(new RegExp(DEPT_NAME))
    expect(mockCreateEmployee).not.toHaveBeenCalled()
  })

  it("includes row number in error when department not found", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, "Inexistente"]])
    const result = await executeImport(TENANT_ID, buf)
    expect(result.errors[0]?.row).toBe(2)
  })

  it("does not call createEmployee when department is not found", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, "Inexistente"]])
    await executeImport(TENANT_ID, buf)
    expect(mockCreateEmployee).not.toHaveBeenCalled()
  })
})

describe("executeImport — employee creation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindDepts.mockResolvedValue([
      { id: DEPT_ID, name: DEPT_NAME } as Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>[number],
    ])
    mockCreateEmployee.mockResolvedValue({} as Awaited<ReturnType<typeof createEmployee>>)
  })

  it("creates employee with name, phone and departmentId", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    await executeImport(TENANT_ID, buf)
    expect(mockCreateEmployee).toHaveBeenCalledWith(TENANT_ID, expect.objectContaining({
      name: "Ana",
      phone: VALID_PHONE,
      departmentId: DEPT_ID,
    }))
  })

  it("passes email to createEmployee when present in row", async () => {
    const buf = await makeBuffer([...PT_HEADERS, "Email"], [["Ana", VALID_PHONE, DEPT_NAME, VALID_EMAIL]])
    await executeImport(TENANT_ID, buf)
    expect(mockCreateEmployee).toHaveBeenCalledWith(TENANT_ID, expect.objectContaining({ email: VALID_EMAIL }))
  })

  it("passes workStartTime and workEndTime to createEmployee when schedule columns present", async () => {
    const buf = await makeBuffer(
      [...PT_HEADERS, WORK_START_HEADER, WORK_END_HEADER],
      [["Ana", VALID_PHONE, DEPT_NAME, WORK_START_TIME, WORK_END_TIME]],
    )
    await executeImport(TENANT_ID, buf)
    expect(mockCreateEmployee).toHaveBeenCalledWith(TENANT_ID, expect.objectContaining({
      workStartTime: WORK_START_TIME,
      workEndTime: WORK_END_TIME,
    }))
  })

  it("does not include workStartTime or workEndTime in createEmployee call when columns absent", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    await executeImport(TENANT_ID, buf)
    const callArg = mockCreateEmployee.mock.calls[0]?.[1]
    expect(callArg).not.toHaveProperty("workStartTime")
    expect(callArg).not.toHaveProperty("workEndTime")
  })

  it("resolves department from 'SETOR' header", async () => {
    const buf = await makeBuffer(["Nome", "Telefone", "SETOR"], [["Ana", VALID_PHONE, DEPT_NAME]])
    await executeImport(TENANT_ID, buf)
    expect(mockCreateEmployee).toHaveBeenCalledWith(TENANT_ID, expect.objectContaining({ departmentId: DEPT_ID }))
  })

  it("reads email from 'E-mail' header with hyphen", async () => {
    const buf = await makeBuffer([...PT_HEADERS, "E-mail"], [["Ana", VALID_PHONE, DEPT_NAME, VALID_EMAIL]])
    await executeImport(TENANT_ID, buf)
    expect(mockCreateEmployee).toHaveBeenCalledWith(TENANT_ID, expect.objectContaining({ email: VALID_EMAIL }))
  })

  it("increments created count for each successfully created employee", async () => {
    const buf = await makeBuffer(PT_HEADERS, [
      ["Ana", VALID_PHONE, DEPT_NAME],
      ["Bruno", VALID_PHONE_2, DEPT_NAME],
    ])
    const result = await executeImport(TENANT_ID, buf)
    expect(result.created).toBe(2)
  })

  it("skips invalid rows and does not attempt to create employee", async () => {
    const buf = await makeBuffer(PT_HEADERS, [
      ["", "", ""],
    ])
    await executeImport(TENANT_ID, buf)
    expect(mockCreateEmployee).not.toHaveBeenCalled()
  })

  it("counts invalid rows in failed", async () => {
    const buf = await makeBuffer(PT_HEADERS, [
      ["", "", ""],
    ])
    const result = await executeImport(TENANT_ID, buf)
    expect(result.failed).toBe(1)
  })

  it("records error message when createEmployee throws", async () => {
    mockCreateEmployee.mockRejectedValue(new Error(EMAIL_ALREADY_EXISTS_ERROR))
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const result = await executeImport(TENANT_ID, buf)
    expect(result.errors[0]?.error).toBe(EMAIL_ALREADY_EXISTS_ERROR)
  })

  it("records stringified error when createEmployee throws a non-Error value", async () => {
    mockCreateEmployee.mockRejectedValue(UNEXPECTED_STRING_ERROR)
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const result = await executeImport(TENANT_ID, buf)
    expect(result.errors[0]?.error).toBe(UNEXPECTED_STRING_ERROR)
  })

  it("continues processing remaining rows after a single row error", async () => {
    mockCreateEmployee
      .mockRejectedValueOnce(new Error(EMAIL_ALREADY_EXISTS_ERROR))
      .mockResolvedValue({} as Awaited<ReturnType<typeof createEmployee>>)

    const buf = await makeBuffer(PT_HEADERS, [
      ["Ana", VALID_PHONE, DEPT_NAME],
      ["Bruno", VALID_PHONE_2, DEPT_NAME],
    ])
    const result = await executeImport(TENANT_ID, buf)
    expect(result.created).toBe(1)
  })

  it("returns zero created and zero failed for empty sheet", async () => {
    const buf = await makeBuffer(PT_HEADERS, [])
    const result = await executeImport(TENANT_ID, buf)
    expect(result.created).toBe(0)
  })
})
