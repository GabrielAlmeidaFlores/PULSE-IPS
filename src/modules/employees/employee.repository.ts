import type { Department, Prisma } from "@prisma/client"
import { prisma } from "@/libs/db"
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@/modules/employees/employee.types"

export type EmployeeWithWorkDays = Prisma.EmployeeGetPayload<{ include: { workDays: true } }>
export type EmployeeWithDepartment = EmployeeWithWorkDays & { department: Department }

export function findEmployeeById(tenantId: string, employeeId: string): Promise<EmployeeWithDepartment | null> {
  return prisma.employee.findFirst({
    where: { id: employeeId, tenantId },
    include: { department: true, workDays: true },
  })
}

export async function findEmployeesByTenant(
  tenantId: string,
  page = 1,
  pageSize = 50,
): Promise<{ employees: EmployeeWithDepartment[]; total: number; page: number; pageSize: number }> {
  const skip = (page - 1) * pageSize
  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where: { tenantId, status: "active" },
      include: { department: true, workDays: true },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.employee.count({ where: { tenantId, status: "active" } }),
  ])
  return { employees, total, page, pageSize }
}

export function findEmployeesByDepartment(tenantId: string, departmentId: string): Promise<EmployeeWithWorkDays[]> {
  return prisma.employee.findMany({
    where: { tenantId, departmentId, status: "active" },
    include: { workDays: true },
    orderBy: { name: "asc" },
  })
}

export function countEmployees(tenantId: string): Promise<number> {
  return prisma.employee.count({ where: { tenantId, status: "active" } })
}

export function createEmployee(tenantId: string, data: CreateEmployeeInput): Promise<EmployeeWithWorkDays> {
  return prisma.employee.create({
    data: {
      tenantId,
      departmentId: data.departmentId,
      name: data.name,
      phone: data.phone,
      ...(data.email !== undefined && { email: data.email }),
      ...(data.workStartTime !== undefined && { workStartTime: data.workStartTime }),
      ...(data.workEndTime !== undefined && { workEndTime: data.workEndTime }),
      ...(data.workDays !== undefined && data.workDays.length > 0 && {
        workDays: { createMany: { data: data.workDays.map((d) => ({ dayOfWeek: d })) } },
      }),
    },
    include: { workDays: true },
  })
}

export async function updateEmployee(
  tenantId: string,
  employeeId: string,
  data: UpdateEmployeeInput,
): Promise<{ count: number }> {
  if (data.workDays !== undefined) {
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } })
    if (!emp) return { count: 0 }
    const { workDays, ...rest } = data
    const updateData: Prisma.EmployeeUpdateInput = {
      ...(rest.departmentId !== undefined && { department: { connect: { id: rest.departmentId } } }),
      ...(rest.name !== undefined && { name: rest.name }),
      ...(rest.phone !== undefined && { phone: rest.phone }),
      ...(rest.email !== undefined && { email: rest.email }),
      ...(rest.status !== undefined && { status: rest.status }),
      ...(rest.workStartTime !== undefined && { workStartTime: rest.workStartTime }),
      ...(rest.workEndTime !== undefined && { workEndTime: rest.workEndTime }),
    }
    if (workDays === null || workDays.length === 0) {
      await prisma.$transaction([
        prisma.employeeWorkDay.deleteMany({ where: { employeeId: emp.id } }),
        prisma.employee.update({ where: { id: emp.id }, data: updateData }),
      ])
    } else {
      await prisma.$transaction([
        prisma.employeeWorkDay.deleteMany({ where: { employeeId: emp.id } }),
        prisma.employee.update({
          where: { id: emp.id },
          data: {
            ...updateData,
            workDays: { createMany: { data: workDays.map((d) => ({ dayOfWeek: d })) } },
          },
        }),
      ])
    }
    return { count: 1 }
  }
  return prisma.employee.updateMany({
    where: { id: employeeId, tenantId },
    data: {
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.workStartTime !== undefined && { workStartTime: data.workStartTime }),
      ...(data.workEndTime !== undefined && { workEndTime: data.workEndTime }),
    },
  })
}

export function deactivateEmployee(tenantId: string, employeeId: string): Promise<{ count: number }> {
  return prisma.employee.updateMany({
    where: { id: employeeId, tenantId },
    data: { status: "inactive" },
  })
}

export async function reactivateDueEmployees(): Promise<{ reactivated: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result = await prisma.employee.updateMany({
    where: {
      status: "paused",
      pauseEndAt: { lte: today },
    },
    data: {
      status: "active",
      pauseEndAt: null,
      pauseStartAt: null,
    },
  })
  return { reactivated: result.count }
}
