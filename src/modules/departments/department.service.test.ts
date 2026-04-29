import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getDepartmentsForListingPage,
  createDept,
  updateDept,
  removeDept,
} from "@/modules/departments/department.service"
import {
  findDepartmentsForListingPage,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
} from "@/modules/departments/department.repository"

vi.mock("@/modules/departments/department.repository")

const mockFindForListing = vi.mocked(findDepartmentsForListingPage)
const mockCreate = vi.mocked(createDepartment)
const mockUpdate = vi.mocked(updateDepartment)
const mockDeactivate = vi.mocked(deactivateDepartment)

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
