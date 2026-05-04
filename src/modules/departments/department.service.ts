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
import { AppError } from "@/libs/errors/app-error"

export function getDepartments(tenantId: string): ReturnType<typeof findDepartmentsByTenant> {
  return findDepartmentsByTenant(tenantId)
}

export function getDepartment(tenantId: string, departmentId: string): ReturnType<typeof findDepartmentById> {
  return findDepartmentById(tenantId, departmentId)
}

export function createDept(tenantId: string, input: CreateDepartmentInput): ReturnType<typeof createDepartment> {
  return createDepartment(tenantId, input)
}

export function updateDept(
  tenantId: string,
  departmentId: string,
  input: UpdateDepartmentInput,
): ReturnType<typeof updateDepartment> {
  return updateDepartment(tenantId, departmentId, input)
}

export async function removeDept(tenantId: string, departmentId: string): Promise<{ count: number }> {
  const activeCount = await countActiveEmployeesByDepartment(tenantId, departmentId)
  if (activeCount > 0) {
    throw new AppError("DEPARTMENT_HAS_EMPLOYEES", "Não é possível excluir um departamento com colaboradores ativos.")
  }
  return deactivateDepartment(tenantId, departmentId)
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
