import { countEmployees, createEmployee, findEmployeeById, findEmployeesByTenant, updateEmployee, deactivateEmployee, reactivateDueEmployees } from "@/modules/employees/employee.repository"
import { findOrganizationById } from "@/modules/organizations/organization.repository"
import { findPlanById } from "@/modules/plans/plan.repository"
import { findActiveSubscription } from "@/modules/billing/billing.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"
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
  if (!org) throw new AppError("ORG_NOT_FOUND", "Organization not found")

  const currentCount = await countEmployees(tenantId)

  if (org.maxEmployeesOverride !== null && org.maxEmployeesOverride !== undefined) {
    if (currentCount >= org.maxEmployeesOverride) throw new AppError("EMPLOYEE_LIMIT_REACHED", "Limite de colaboradores atingido.")
  } else {
    const subscription = await findActiveSubscription(tenantId)
    if (subscription) {
      if (currentCount >= subscription.snapshotMaxEmployees) throw new AppError("EMPLOYEE_LIMIT_REACHED", "Limite de colaboradores atingido.")
    } else if (org.planId) {
      const plan = await findPlanById(org.planId)
      if (plan && currentCount >= plan.maxEmployees) throw new AppError("EMPLOYEE_LIMIT_REACHED", "Limite de colaboradores atingido.")
    }
  }

  const employee = await createEmployee(tenantId, input)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "employee.created", resource: "employees", resourceId: employee.id })
  return employee
}

export function updateExistingEmployee(
  tenantId: string,
  employeeId: string,
  input: UpdateEmployeeInput,
): ReturnType<typeof updateEmployee> {
  return updateEmployee(tenantId, employeeId, input)
}

export async function deactivateExistingEmployee(tenantId: string, employeeId: string, actorId?: string): Promise<void> {
  await deactivateEmployee(tenantId, employeeId)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "employee.deactivated", resource: "employees", resourceId: employeeId })
}

export function getTotalEmployeeCount(tenantId: string): Promise<number> {
  return countEmployees(tenantId)
}

export function unpauseDueEmployees(): Promise<{ reactivated: number }> {
  return reactivateDueEmployees()
}
