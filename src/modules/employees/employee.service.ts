import { countEmployees, createEmployee, findEmployeeById, findEmployeesByTenant, updateEmployee, deactivateEmployee, reactivateAllTenantsDueEmployees, findEmployeesForListingPage, softDeleteEmployee, type EmployeeListingFilters } from "@/modules/employees/employee.repository"
import { findOrganizationById } from "@/modules/organizations/organization.repository"
import { findPlanById } from "@/modules/plans/plan.repository"
import { findActiveSubscription } from "@/modules/billing/billing.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"
import { getEmployeeIdsForConsentState } from "@/modules/consent/consent.service"
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@/modules/employees/employee.types"
import { AppError } from "@/libs/errors/app-error"

export function getEmployees(tenantId: string, page?: number, pageSize?: number): ReturnType<typeof findEmployeesByTenant> {
  return findEmployeesByTenant(tenantId, page, pageSize)
}

export function getEmployee(tenantId: string, employeeId: string): ReturnType<typeof findEmployeeById> {
  return findEmployeeById(tenantId, employeeId)
}

export async function createNewEmployee(tenantId: string, input: CreateEmployeeInput, actorId?: string): ReturnType<typeof createEmployee> {
  const org = await findOrganizationById(tenantId)
  if (!org) throw new AppError("ORG_NOT_FOUND", "Organização não encontrada.")

  const currentCount = await countEmployees(tenantId)

  if (org.maxEmployeesOverride !== null && org.maxEmployeesOverride !== undefined) {
    if (currentCount >= org.maxEmployeesOverride) throw new AppError("EMPLOYEE_LIMIT_REACHED", "Limite de colaboradores atingido.")
  } else {
    const subscription = await findActiveSubscription(tenantId)
    if (subscription) {
      if (subscription.snapshotMaxEmployees !== null && currentCount >= subscription.snapshotMaxEmployees) throw new AppError("EMPLOYEE_LIMIT_REACHED", "Limite de colaboradores atingido.")
    } else if (org.planId) {
      const plan = await findPlanById(org.planId)
      if (plan && plan.maxEmployees !== null && currentCount >= plan.maxEmployees) throw new AppError("EMPLOYEE_LIMIT_REACHED", "Limite de colaboradores atingido.")
    }
  }

  const employee = await createEmployee(tenantId, input)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "employee.created", resource: "employees", resourceId: employee.id })
  return employee
}

export async function updateExistingEmployee(
  tenantId: string,
  employeeId: string,
  input: UpdateEmployeeInput,
  actorId?: string,
): ReturnType<typeof updateEmployee> {
  const result = await updateEmployee(tenantId, employeeId, input)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "employee.updated", resource: "employees", resourceId: employeeId })
  return result
}

export async function deactivateExistingEmployee(tenantId: string, employeeId: string, actorId?: string): Promise<void> {
  await deactivateEmployee(tenantId, employeeId)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "employee.deactivated", resource: "employees", resourceId: employeeId })
}

export async function deleteExistingEmployee(tenantId: string, employeeId: string, actorId?: string): Promise<void> {
  await softDeleteEmployee(tenantId, employeeId)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "employee.deleted", resource: "employees", resourceId: employeeId })
}

export function getTotalEmployeeCount(tenantId: string): Promise<number> {
  return countEmployees(tenantId)
}

export function unpauseAllTenantsDueEmployees(): Promise<{ reactivated: number }> {
  return reactivateAllTenantsDueEmployees()
}

export interface EmployeeListingQuery {
  q?: string
  departmentId?: string
  status?: string
  consent?: string
  page: number
  pageSize: number
}

export async function getEmployeesForListingPage(
  tenantId: string,
  query: EmployeeListingQuery,
): Promise<{ employees: Awaited<ReturnType<typeof findEmployeesForListingPage>>["employees"]; total: number }> {
  const skip = (query.page - 1) * query.pageSize

  const filters: EmployeeListingFilters = {}
  if (query.q !== undefined) filters.q = query.q
  if (query.departmentId !== undefined) filters.departmentId = query.departmentId
  if (query.status !== undefined) filters.status = query.status

  if (query.consent !== undefined) {
    const ids = await getEmployeeIdsForConsentState(tenantId, query.consent)
    filters.consentEmployeeIds = ids
    if (ids.length === 0) {
      return { employees: [], total: 0 }
    }
  }

  return findEmployeesForListingPage(tenantId, filters, skip, query.pageSize)
}
