import {
  findDepartmentsByTenant,
  findDepartmentById,
  findActiveDepartmentsByTenant,
  findDepartmentsForListingPage,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  countActiveEmployeesByDepartment,
  type DepartmentWithWorkDays,
  type DepartmentListingFilters,
} from "@/modules/departments/department.repository"
import type { CreateDepartmentInput, UpdateDepartmentInput } from "@/modules/departments/department.types"
import { createAuditLog } from "@/modules/audit/audit.repository"
import { AppError } from "@/libs/errors/app-error"

export function getDepartments(tenantId: string): ReturnType<typeof findDepartmentsByTenant> {
  return findDepartmentsByTenant(tenantId)
}

export function getDepartment(tenantId: string, departmentId: string): ReturnType<typeof findDepartmentById> {
  return findDepartmentById(tenantId, departmentId)
}

export async function createDept(tenantId: string, input: CreateDepartmentInput, actorId?: string): ReturnType<typeof createDepartment> {
  const dept = await createDepartment(tenantId, input)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "department.created", resource: "departments", resourceId: dept.id, metadata: { name: dept.name } })
  return dept
}

export async function updateDept(
  tenantId: string,
  departmentId: string,
  input: UpdateDepartmentInput,
  actorId?: string,
): ReturnType<typeof updateDepartment> {
  const result = await updateDepartment(tenantId, departmentId, input)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "department.updated", resource: "departments", resourceId: departmentId })
  return result
}

export async function removeDept(tenantId: string, departmentId: string, actorId?: string): Promise<{ count: number }> {
  const activeCount = await countActiveEmployeesByDepartment(tenantId, departmentId)
  if (activeCount > 0) {
    throw new AppError("DEPARTMENT_HAS_EMPLOYEES", "Não é possível excluir um departamento com colaboradores ativos.")
  }
  const result = await deactivateDepartment(tenantId, departmentId)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "department.deleted", resource: "departments", resourceId: departmentId })
  return result
}

export function getActiveDepartments(tenantId: string): Promise<DepartmentWithWorkDays[]> {
  return findActiveDepartmentsByTenant(tenantId)
}

interface DepartmentListingQuery {
  q?: string
  page: number
  pageSize: number
}

export function getDepartmentsForListingPage(
  tenantId: string,
  query: DepartmentListingQuery,
): ReturnType<typeof findDepartmentsForListingPage> {
  const skip = (query.page - 1) * query.pageSize
  const filters: DepartmentListingFilters = {}
  if (query.q !== undefined) filters.q = query.q
  return findDepartmentsForListingPage(tenantId, filters, skip, query.pageSize)
}
