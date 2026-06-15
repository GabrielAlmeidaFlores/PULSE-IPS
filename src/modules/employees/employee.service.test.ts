import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createNewEmployee,
  deactivateExistingEmployee,
  deleteExistingEmployee,
  unpauseAllTenantsDueEmployees,
  getEmployees,
  getEmployee,
  updateExistingEmployee,
  getTotalEmployeeCount,
  getEmployeesForListingPage,
} from "@/modules/employees/employee.service"
import {
  countEmployees,
  createEmployee,
  deactivateEmployee,
  softDeleteEmployee,
  reactivateAllTenantsDueEmployees,
  findEmployeesByTenant,
  findEmployeeById,
  updateEmployee,
  findEmployeesForListingPage,
  findEmployeeByEmail,
  type EmployeeWithDepartment,
} from "@/modules/employees/employee.repository"
import { findOrganizationById } from "@/modules/organizations/organization.repository"
import { findPlanById } from "@/modules/plans/plan.repository"
import { findActiveSubscription } from "@/modules/billing/billing.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"
import { getEmployeeIdsForConsentState } from "@/modules/consent/consent.service"

vi.mock("@/modules/employees/employee.repository")
vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/modules/plans/plan.repository")
vi.mock("@/modules/billing/billing.repository")
vi.mock("@/modules/audit/audit.repository")
vi.mock("@/modules/consent/consent.service")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockCountEmployees = vi.mocked(countEmployees)
const mockCreateEmployee = vi.mocked(createEmployee)
const mockDeactivateEmployee = vi.mocked(deactivateEmployee)
const mockSoftDeleteEmployee = vi.mocked(softDeleteEmployee)
const mockReactivateAllTenantsDueEmployees = vi.mocked(reactivateAllTenantsDueEmployees)
const mockFindEmployeesByTenant = vi.mocked(findEmployeesByTenant)
const mockFindEmployeeById = vi.mocked(findEmployeeById)
const mockFindEmployeeByEmail = vi.mocked(findEmployeeByEmail)
const mockUpdateEmployee = vi.mocked(updateEmployee)
const mockFindOrganizationById = vi.mocked(findOrganizationById)
const mockFindPlanById = vi.mocked(findPlanById)
const mockFindActiveSubscription = vi.mocked(findActiveSubscription)
const mockCreateAuditLog = vi.mocked(createAuditLog)
const mockFindEmployeesForListingPage = vi.mocked(findEmployeesForListingPage)
const mockGetEmployeeIdsForConsentState = vi.mocked(getEmployeeIdsForConsentState)

const TENANT_ID = "tenant-1"
const EMPLOYEE_INPUT = { name: "Ana Silva", phone: "+5511999999999", departmentId: "dept-1" }
const CREATED_EMPLOYEE = { id: "emp-1", tenantId: TENANT_ID, ...EMPLOYEE_INPUT }

const ORG_NO_OVERRIDE = { id: TENANT_ID, maxEmployeesOverride: null, planId: "plan-1" }

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateEmployee.mockResolvedValue(CREATED_EMPLOYEE as Awaited<ReturnType<typeof createEmployee>>)
  mockCreateAuditLog.mockResolvedValue(undefined)
  mockDeactivateEmployee.mockResolvedValue({ count: 0 })
  mockSoftDeleteEmployee.mockResolvedValue({ count: 1 })
  mockFindEmployeeByEmail.mockResolvedValue(null)
})

describe("createNewEmployee — employee limit checks", () => {
  it("throws when maxEmployeesOverride is reached", async () => {
    mockFindOrganizationById.mockResolvedValue({ ...ORG_NO_OVERRIDE, maxEmployeesOverride: 5 } as Awaited<ReturnType<typeof findOrganizationById>>)
    mockCountEmployees.mockResolvedValue(5)

    await expect(createNewEmployee(TENANT_ID, EMPLOYEE_INPUT)).rejects.toMatchObject({
      code: "EMPLOYEE_LIMIT_REACHED",
    })
    expect(mockCreateEmployee).not.toHaveBeenCalled()
  })

  it("allows creation when below maxEmployeesOverride", async () => {
    mockFindOrganizationById.mockResolvedValue({ ...ORG_NO_OVERRIDE, maxEmployeesOverride: 10 } as Awaited<ReturnType<typeof findOrganizationById>>)
    mockCountEmployees.mockResolvedValue(9)

    const result = await createNewEmployee(TENANT_ID, EMPLOYEE_INPUT)
    expect(result).toEqual(CREATED_EMPLOYEE)
    expect(mockCreateEmployee).toHaveBeenCalledOnce()
  })

  it("throws when subscription limit is reached (no override)", async () => {
    mockFindOrganizationById.mockResolvedValue(ORG_NO_OVERRIDE as Awaited<ReturnType<typeof findOrganizationById>>)
    mockFindActiveSubscription.mockResolvedValue({ snapshotMaxEmployees: 10 } as Awaited<ReturnType<typeof findActiveSubscription>>)
    mockCountEmployees.mockResolvedValue(10)

    await expect(createNewEmployee(TENANT_ID, EMPLOYEE_INPUT)).rejects.toMatchObject({
      code: "EMPLOYEE_LIMIT_REACHED",
    })
  })

  it("allows creation when below subscription limit", async () => {
    mockFindOrganizationById.mockResolvedValue(ORG_NO_OVERRIDE as Awaited<ReturnType<typeof findOrganizationById>>)
    mockFindActiveSubscription.mockResolvedValue({ snapshotMaxEmployees: 10 } as Awaited<ReturnType<typeof findActiveSubscription>>)
    mockCountEmployees.mockResolvedValue(5)

    const result = await createNewEmployee(TENANT_ID, EMPLOYEE_INPUT)
    expect(result).toEqual(CREATED_EMPLOYEE)
  })

  it("throws when plan limit is reached (no subscription)", async () => {
    mockFindOrganizationById.mockResolvedValue(ORG_NO_OVERRIDE as Awaited<ReturnType<typeof findOrganizationById>>)
    mockFindActiveSubscription.mockResolvedValue(null)
    mockFindPlanById.mockResolvedValue({ id: "plan-1", maxEmployees: 5 } as Awaited<ReturnType<typeof findPlanById>>)
    mockCountEmployees.mockResolvedValue(5)

    await expect(createNewEmployee(TENANT_ID, EMPLOYEE_INPUT)).rejects.toMatchObject({
      code: "EMPLOYEE_LIMIT_REACHED",
    })
  })

  it("allows creation when no subscription and no plan restriction", async () => {
    mockFindOrganizationById.mockResolvedValue({ ...ORG_NO_OVERRIDE, planId: null } as Awaited<ReturnType<typeof findOrganizationById>>)
    mockFindActiveSubscription.mockResolvedValue(null)
    mockCountEmployees.mockResolvedValue(100)

    const result = await createNewEmployee(TENANT_ID, EMPLOYEE_INPUT)
    expect(result).toEqual(CREATED_EMPLOYEE)
  })

  it("throws when org not found", async () => {
    mockFindOrganizationById.mockResolvedValue(null)

    await expect(createNewEmployee(TENANT_ID, EMPLOYEE_INPUT)).rejects.toMatchObject({
      code: "ORG_NOT_FOUND",
    })
  })

  it("creates audit log after successful creation", async () => {
    mockFindOrganizationById.mockResolvedValue({ ...ORG_NO_OVERRIDE, maxEmployeesOverride: 10 } as Awaited<ReturnType<typeof findOrganizationById>>)
    mockCountEmployees.mockResolvedValue(0)

    await createNewEmployee(TENANT_ID, EMPLOYEE_INPUT, "actor-1")

    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "employee.created", resourceId: CREATED_EMPLOYEE.id }),
    )
  })
})

describe("createNewEmployee — email conflict check", () => {
  const INPUT_WITH_EMAIL = { ...EMPLOYEE_INPUT, email: "ana@empresa.com" }

  beforeEach(() => {
    mockFindOrganizationById.mockResolvedValue({ ...ORG_NO_OVERRIDE, maxEmployeesOverride: 10 } as Awaited<ReturnType<typeof findOrganizationById>>)
    mockCountEmployees.mockResolvedValue(0)
  })

  it("lança EMAIL_CONFLICT quando email já existe (inclui soft-deleted)", async () => {
    mockFindEmployeeByEmail.mockResolvedValue(
      { id: "emp-existing", email: "ana@empresa.com" } as Awaited<ReturnType<typeof findEmployeeByEmail>>,
    )

    await expect(createNewEmployee(TENANT_ID, INPUT_WITH_EMAIL)).rejects.toMatchObject({
      code: "EMAIL_CONFLICT",
    })
    expect(mockCreateEmployee).not.toHaveBeenCalled()
  })

  it("não chama findEmployeeByEmail quando email não é fornecido", async () => {
    await createNewEmployee(TENANT_ID, EMPLOYEE_INPUT)

    expect(mockFindEmployeeByEmail).not.toHaveBeenCalled()
    expect(mockCreateEmployee).toHaveBeenCalledOnce()
  })

  it("cria colaborador normalmente quando email não existe ainda", async () => {
    mockFindEmployeeByEmail.mockResolvedValue(null)

    const result = await createNewEmployee(TENANT_ID, INPUT_WITH_EMAIL)

    expect(mockFindEmployeeByEmail).toHaveBeenCalledWith(TENANT_ID, "ana@empresa.com")
    expect(result).toEqual(CREATED_EMPLOYEE)
  })
})

describe("deactivateExistingEmployee", () => {
  it("calls deactivateEmployee and creates audit log", async () => {
    await deactivateExistingEmployee(TENANT_ID, "emp-1", "actor-1")

    expect(mockDeactivateEmployee).toHaveBeenCalledWith(TENANT_ID, "emp-1")
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "employee.deactivated", resourceId: "emp-1" }),
    )
  })

  it("works without actorId", async () => {
    await deactivateExistingEmployee(TENANT_ID, "emp-1")

    expect(mockDeactivateEmployee).toHaveBeenCalledWith(TENANT_ID, "emp-1")
    expect(mockCreateAuditLog).toHaveBeenCalledOnce()
  })
})

describe("unpauseAllTenantsDueEmployees", () => {
  it("reactivates paused employees whose pause period ended and returns count", async () => {
    mockReactivateAllTenantsDueEmployees.mockResolvedValue({ reactivated: 3 })

    const result = await unpauseAllTenantsDueEmployees()
    expect(result).toEqual({ reactivated: 3 })
    expect(mockReactivateAllTenantsDueEmployees).toHaveBeenCalledOnce()
  })
})

describe("getEmployees", () => {
  it("returns paginated employees for the given tenant", async () => {
    const paginatedResult = {
      employees: [CREATED_EMPLOYEE] as EmployeeWithDepartment[],
      total: 1,
      page: 1,
      pageSize: 20,
    }
    mockFindEmployeesByTenant.mockResolvedValue(paginatedResult)

    const result = await getEmployees(TENANT_ID, 1, 20)
    expect(result).toEqual(paginatedResult)
    expect(mockFindEmployeesByTenant).toHaveBeenCalledWith(TENANT_ID, 1, 20)
  })
})

describe("getEmployee", () => {
  it("returns a single employee by id", async () => {
    mockFindEmployeeById.mockResolvedValue(CREATED_EMPLOYEE as Awaited<ReturnType<typeof findEmployeeById>>)

    const result = await getEmployee(TENANT_ID, "emp-1")
    expect(result).toEqual(CREATED_EMPLOYEE)
    expect(mockFindEmployeeById).toHaveBeenCalledWith(TENANT_ID, "emp-1")
  })
})

describe("updateExistingEmployee", () => {
  it("updates employee fields and returns updated record", async () => {
    mockUpdateEmployee.mockResolvedValue({ count: 1 })

    const result = await updateExistingEmployee(TENANT_ID, "emp-1", { name: "Ana Updated" })
    expect(result).toEqual({ count: 1 })
    expect(mockUpdateEmployee).toHaveBeenCalledWith(TENANT_ID, "emp-1", { name: "Ana Updated" })
  })
})

describe("getTotalEmployeeCount", () => {
  it("returns total employee count for the given tenant", async () => {
    mockCountEmployees.mockResolvedValue(42)

    const result = await getTotalEmployeeCount(TENANT_ID)
    expect(result).toBe(42)
    expect(mockCountEmployees).toHaveBeenCalledWith(TENANT_ID)
  })
})

describe("getEmployeesForListingPage", () => {
  const PAGED_RESULT = {
    employees: [{ id: "emp-1" }] as EmployeeWithDepartment[],
    total: 1,
  }

  beforeEach(() => {
    mockFindEmployeesForListingPage.mockResolvedValue(PAGED_RESULT as Awaited<ReturnType<typeof findEmployeesForListingPage>>)
  })

  it("calcula skip corretamente e repassa para o repository", async () => {
    await getEmployeesForListingPage(TENANT_ID, { page: 3, pageSize: 10 })

    expect(mockFindEmployeesForListingPage).toHaveBeenCalledWith(TENANT_ID, {}, 20, 10)
  })

  it("repassa filtro q quando definido", async () => {
    await getEmployeesForListingPage(TENANT_ID, { page: 1, pageSize: 10, q: "ana" })

    expect(mockFindEmployeesForListingPage).toHaveBeenCalledWith(TENANT_ID, { q: "ana" }, 0, 10)
  })

  it("repassa filtro departmentId quando definido", async () => {
    await getEmployeesForListingPage(TENANT_ID, { page: 1, pageSize: 10, departmentId: "dept-1" })

    expect(mockFindEmployeesForListingPage).toHaveBeenCalledWith(TENANT_ID, { departmentId: "dept-1" }, 0, 10)
  })

  it("repassa filtro status quando definido", async () => {
    await getEmployeesForListingPage(TENANT_ID, { page: 1, pageSize: 10, status: "active" })

    expect(mockFindEmployeesForListingPage).toHaveBeenCalledWith(TENANT_ID, { status: "active" }, 0, 10)
  })

  it("retorna lista vazia imediatamente quando filtro consent retorna zero ids", async () => {
    mockGetEmployeeIdsForConsentState.mockResolvedValue([])

    const result = await getEmployeesForListingPage(TENANT_ID, { page: 1, pageSize: 10, consent: "accepted" })

    expect(result).toEqual({ employees: [], total: 0 })
    expect(mockFindEmployeesForListingPage).not.toHaveBeenCalled()
  })

  it("filtra por ids de consentimento quando filtro consent retorna ids", async () => {
    const ids = ["emp-1", "emp-2"]
    mockGetEmployeeIdsForConsentState.mockResolvedValue(ids)

    await getEmployeesForListingPage(TENANT_ID, { page: 1, pageSize: 10, consent: "accepted" })

    expect(mockFindEmployeesForListingPage).toHaveBeenCalledWith(
      TENANT_ID,
      { consentEmployeeIds: ids },
      0,
      10,
    )
  })
})

describe("deleteExistingEmployee", () => {
  it("faz soft-delete do colaborador e registra log de auditoria", async () => {
    await deleteExistingEmployee(TENANT_ID, "emp-1", "user-1")

    expect(mockSoftDeleteEmployee).toHaveBeenCalledWith(TENANT_ID, "emp-1")
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, userId: "user-1", action: "employee.deleted" }),
    )
  })

  it("faz soft-delete mesmo quando colaborador possui histórico de consentimento", async () => {
    await deleteExistingEmployee(TENANT_ID, "emp-1", "user-1")

    expect(mockSoftDeleteEmployee).toHaveBeenCalledWith(TENANT_ID, "emp-1")
    expect(mockCreateAuditLog).toHaveBeenCalled()
  })

  it("não inclui userId no log de auditoria quando actorId não é fornecido", async () => {
    await deleteExistingEmployee(TENANT_ID, "emp-1")

    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.not.objectContaining({ userId: expect.anything() as string }),
    )
  })
})
