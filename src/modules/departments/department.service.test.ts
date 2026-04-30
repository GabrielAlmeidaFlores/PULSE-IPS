import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getDepartmentsForListingPage,
  createDept,
  updateDept,
  removeDept,
  getDepartments,
  getDepartment,
  getActiveDepartments,
} from "@/modules/departments/department.service"
import {
  findDepartmentsForListingPage,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  findDepartmentsByTenant,
  findDepartmentById,
  findActiveDepartmentsByTenant,
  type DepartmentWithWorkDays,
} from "@/modules/departments/department.repository"

vi.mock("@/modules/departments/department.repository")

const mockFindForListing = vi.mocked(findDepartmentsForListingPage)
const mockCreate = vi.mocked(createDepartment)
const mockUpdate = vi.mocked(updateDepartment)
const mockDeactivate = vi.mocked(deactivateDepartment)
const mockFindByTenant = vi.mocked(findDepartmentsByTenant)
const mockFindById = vi.mocked(findDepartmentById)
const mockFindActive = vi.mocked(findActiveDepartmentsByTenant)

const TENANT_ID = "tenant-1"
const DEPT_ID = "dept-1"

const DEPT_RESULT = { items: [], total: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  mockFindForListing.mockResolvedValue(DEPT_RESULT)
  mockCreate.mockResolvedValue({
    id: DEPT_ID,
    tenantId: TENANT_ID,
    name: "Engenharia",
    isActive: true,
    workStartTime: "09:00",
    workEndTime: "18:00",
    createdAt: new Date(),
    updatedAt: new Date(),
    workDays: [],
  })
  mockUpdate.mockResolvedValue({ count: 1 })
  mockDeactivate.mockResolvedValue({ count: 1 })
})

describe("getDepartmentsForListingPage", () => {
  it("calcula skip e repassa filtros ao repository", async () => {
    await getDepartmentsForListingPage(TENANT_ID, { page: 2, pageSize: 10 })

    expect(mockFindForListing).toHaveBeenCalledWith(TENANT_ID, {}, 10, 10)
  })

  it("inclui filtro de busca quando q está presente", async () => {
    await getDepartmentsForListingPage(TENANT_ID, { page: 1, pageSize: 10, q: "eng" })

    expect(mockFindForListing).toHaveBeenCalledWith(TENANT_ID, { q: "eng" }, 0, 10)
  })
})

describe("createDept", () => {
  it("delega criação ao repository", async () => {
    const input = { name: "Engenharia", workStartTime: "09:00", workEndTime: "18:00", workDays: [1, 2, 3, 4, 5] }
    await createDept(TENANT_ID, input)
    expect(mockCreate).toHaveBeenCalledWith(TENANT_ID, input)
  })
})

describe("updateDept", () => {
  it("delega atualização ao repository", async () => {
    const input = { name: "Engenharia 2" }
    await updateDept(TENANT_ID, DEPT_ID, input)
    expect(mockUpdate).toHaveBeenCalledWith(TENANT_ID, DEPT_ID, input)
  })
})

describe("removeDept", () => {
  it("delega desativação ao repository", async () => {
    await removeDept(TENANT_ID, DEPT_ID)
    expect(mockDeactivate).toHaveBeenCalledWith(TENANT_ID, DEPT_ID)
  })
})

describe("getDepartments", () => {
  it("delega ao repository e retorna lista de setores", async () => {
    mockFindByTenant.mockResolvedValue([{ id: DEPT_ID, name: "Engenharia" }] as Awaited<ReturnType<typeof findDepartmentsByTenant>>)

    const result = await getDepartments(TENANT_ID)

    expect(mockFindByTenant).toHaveBeenCalledWith(TENANT_ID)
    expect(result).toHaveLength(1)
  })
})

describe("getDepartment", () => {
  it("delega ao repository e retorna setor por id", async () => {
    mockFindById.mockResolvedValue({ id: DEPT_ID, name: "Engenharia" } as Awaited<ReturnType<typeof findDepartmentById>>)

    const result = await getDepartment(TENANT_ID, DEPT_ID)

    expect(mockFindById).toHaveBeenCalledWith(TENANT_ID, DEPT_ID)
    expect(result).toMatchObject({ id: DEPT_ID })
  })
})

describe("getActiveDepartments", () => {
  it("retorna apenas setores ativos do tenant", async () => {
    const active: DepartmentWithWorkDays[] = [
      { id: DEPT_ID, tenantId: TENANT_ID, name: "Engenharia", isActive: true, workStartTime: "09:00", workEndTime: "18:00", createdAt: new Date(), updatedAt: new Date(), workDays: [] },
    ]
    mockFindActive.mockResolvedValue(active)

    const result = await getActiveDepartments(TENANT_ID)

    expect(mockFindActive).toHaveBeenCalledWith(TENANT_ID)
    expect(result).toEqual(active)
  })
})
