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
const VALID_EMAIL = "ana@test.com"
const DEPT_NAME = "TI"
const DEPT_ID = "dept-ti"

async function makeBuffer(headers: string[], rows: (string | undefined)[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Dados")
  ws.addRow(headers)
  for (const row of rows) ws.addRow(row)
  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}

describe("parseImportPreview — header detection", () => {
  it("detects 'Nome' header (case-insensitive)", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.name).toBe("Ana")
  })

  it("detects 'name' header (English lowercase)", async () => {
    const buf = await makeBuffer(EN_HEADERS, [["Carlos", VALID_PHONE_2, "RH"]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.name).toBe("Carlos")
  })

  it("detects 'Telefone' header for phone", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", "+5511777777777", DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.phone).toBe("+5511777777777")
  })

  it("detects 'phone' header (English)", async () => {
    const buf = await makeBuffer(EN_HEADERS, [["Ana", "+5511666666666", DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.phone).toBe("+5511666666666")
  })

  it("detects 'Departamento' header for departmentName", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, "Marketing"]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.departmentName).toBe("Marketing")
  })

  it("reads optional email column when present", async () => {
    const buf = await makeBuffer([...PT_HEADERS, "Email"], [["Ana", VALID_PHONE, DEPT_NAME, VALID_EMAIL]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.email).toBe(VALID_EMAIL)
  })

  it("leaves email undefined when column is absent", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.email).toBeUndefined()
  })
})

describe("parseImportPreview — valid rows", () => {
  it("marks row as valid when all required fields are present", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.valid).toBe(true)
  })

  it("counts valid rows correctly", async () => {
    const buf = await makeBuffer(PT_HEADERS, [
      ["Ana", VALID_PHONE, DEPT_NAME],
      ["Bruno", VALID_PHONE_2, "RH"],
    ])
    const preview = await parseImportPreview(buf)
    expect(preview.valid).toBe(2)
  })

  it("trims leading and trailing whitespace from cell values", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["  Ana  ", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.name).toBe("Ana")
  })

  it("returns empty errors array for valid rows", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.errors).toEqual([])
  })

  it("includes correct row number (data starts at row 2)", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.row).toBe(2)
  })
})

describe("parseImportPreview — invalid rows", () => {
  it("marks row as invalid when name is missing", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.valid).toBe(false)
  })

  it("marks row as invalid when phone is missing", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", "", DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.valid).toBe(false)
  })

  it("marks row as invalid when departmentName is missing", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, ""]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.valid).toBe(false)
  })

  it("populates errors array with messages for invalid rows", async () => {
    const buf = await makeBuffer(PT_HEADERS, [["", VALID_PHONE, DEPT_NAME]])
    const preview = await parseImportPreview(buf)
    expect(preview.items[0]?.errors.length).toBeGreaterThan(0)
  })

  it("counts invalid rows correctly", async () => {
    const buf = await makeBuffer(PT_HEADERS, [
      ["Ana", VALID_PHONE, DEPT_NAME],
      ["", "", ""],
    ])
    const preview = await parseImportPreview(buf)
    expect(preview.invalid).toBe(1)
  })

  it("throws SHEET_NOT_FOUND when workbook has no sheets", async () => {
    const wb = new ExcelJS.Workbook()
    const buf = await wb.xlsx.writeBuffer() as ArrayBuffer
    await expect(parseImportPreview(buf)).rejects.toMatchObject({ code: "SHEET_NOT_FOUND" })
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
    mockCreateEmployee.mockRejectedValue(new Error("E-mail já cadastrado"))
    const buf = await makeBuffer(PT_HEADERS, [["Ana", VALID_PHONE, DEPT_NAME]])
    const result = await executeImport(TENANT_ID, buf)
    expect(result.errors[0]?.error).toBe("E-mail já cadastrado")
  })

  it("continues processing remaining rows after a single row error", async () => {
    mockCreateEmployee
      .mockRejectedValueOnce(new Error("E-mail duplicado"))
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
