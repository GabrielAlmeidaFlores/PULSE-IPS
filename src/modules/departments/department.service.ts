import {
  findDepartmentsByTenant,
  findDepartmentById,
  findActiveDepartmentsByTenant,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
} from "@/modules/departments/department.repository"
import type { CreateDepartmentInput, UpdateDepartmentInput } from "@/modules/departments/department.types"
import type { Department } from "@prisma/client"

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

export function removeDept(tenantId: string, departmentId: string): ReturnType<typeof deactivateDepartment> {
  return deactivateDepartment(tenantId, departmentId)
}

export function getActiveDepartments(tenantId: string): Promise<Department[]> {
  return findActiveDepartmentsByTenant(tenantId)
}
