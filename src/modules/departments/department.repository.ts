import { prisma } from "@/libs/db"
import type { Prisma } from "@prisma/client"
import type { CreateDepartmentInput, UpdateDepartmentInput } from "@/modules/departments/department.types"

export type DepartmentWithWorkDays = Prisma.DepartmentGetPayload<{ include: { workDays: true } }>

export function findDepartmentsByTenant(tenantId: string): Promise<(DepartmentWithWorkDays & { _count: { employees: number } })[]> {
  return prisma.department.findMany({
    where: { tenantId, isActive: true },
    include: { workDays: true, _count: { select: { employees: true } } },
    orderBy: { name: "asc" },
  })
}

export function findDepartmentById(tenantId: string, departmentId: string): Promise<DepartmentWithWorkDays | null> {
  return prisma.department.findFirst({
    where: { id: departmentId, tenantId },
    include: { workDays: true },
  })
}

export function createDepartment(tenantId: string, data: CreateDepartmentInput): Promise<DepartmentWithWorkDays> {
  const days = data.workDays ?? [1, 2, 3, 4, 5]
  return prisma.department.create({
    data: {
      tenantId,
      name: data.name,
      ...(data.workStartTime !== undefined && { workStartTime: data.workStartTime }),
      ...(data.workEndTime !== undefined && { workEndTime: data.workEndTime }),
      workDays: { createMany: { data: days.map((d) => ({ dayOfWeek: d })) } },
    },
    include: { workDays: true },
  })
}

export async function updateDepartment(
  tenantId: string,
  departmentId: string,
  data: UpdateDepartmentInput,
): Promise<{ count: number }> {
  if (data.workDays !== undefined) {
    const dept = await prisma.department.findFirst({ where: { id: departmentId, tenantId }, select: { id: true } })
    if (!dept) return { count: 0 }
    const { workDays, ...rest } = data
    await prisma.$transaction([
      prisma.departmentWorkDay.deleteMany({ where: { departmentId: dept.id } }),
      prisma.department.update({
        where: { id: dept.id },
        data: {
          ...rest,
          workDays: { createMany: { data: workDays.map((d) => ({ dayOfWeek: d })) } },
        },
      }),
    ])
    return { count: 1 }
  }
  return prisma.department.updateMany({ where: { id: departmentId, tenantId }, data })
}

export function deactivateDepartment(tenantId: string, departmentId: string): Promise<{ count: number }> {
  return prisma.department.updateMany({
    where: { id: departmentId, tenantId },
    data: { isActive: false },
  })
}

export function findActiveDepartmentsByTenant(tenantId: string): Promise<DepartmentWithWorkDays[]> {
  return prisma.department.findMany({
    where: { tenantId, isActive: true },
    include: { workDays: true },
  })
}
