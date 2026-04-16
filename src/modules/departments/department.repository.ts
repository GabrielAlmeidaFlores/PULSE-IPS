import { prisma } from "@/libs/db"
import type { Department } from "@prisma/client"
import type { CreateDepartmentInput, UpdateDepartmentInput } from "@/modules/departments/department.types"

export function findDepartmentsByTenant(tenantId: string): Promise<(Department & { _count: { employees: number } })[]> {
  return prisma.department.findMany({
    where: { tenantId, isActive: true },
    include: { _count: { select: { employees: true } } },
    orderBy: { name: "asc" },
  })
}

export function findDepartmentById(tenantId: string, departmentId: string): Promise<Department | null> {
  return prisma.department.findFirst({ where: { id: departmentId, tenantId } })
}

export function createDepartment(tenantId: string, data: CreateDepartmentInput): Promise<Department> {
  return prisma.department.create({ data: { ...data, tenantId } })
}

export function updateDepartment(
  tenantId: string,
  departmentId: string,
  data: UpdateDepartmentInput,
): Promise<{ count: number }> {
  return prisma.department.updateMany({ where: { id: departmentId, tenantId }, data })
}

export function deactivateDepartment(tenantId: string, departmentId: string): Promise<{ count: number }> {
  return prisma.department.updateMany({
    where: { id: departmentId, tenantId },
    data: { isActive: false },
  })
}

export function findActiveDepartmentsByTenant(tenantId: string): Promise<Department[]> {
  return prisma.department.findMany({ where: { tenantId, isActive: true } })
}
