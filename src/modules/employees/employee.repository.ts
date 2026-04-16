import type { Employee, Department } from "@prisma/client"
import { prisma } from "@/libs/db"
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@/modules/employees/employee.types"

export type EmployeeWithDepartment = Employee & { department: Department }

export function findEmployeeById(tenantId: string, employeeId: string): Promise<EmployeeWithDepartment | null> {
  return prisma.employee.findFirst({
    where: { id: employeeId, tenantId },
    include: { department: true },
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
      include: { department: true },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.employee.count({ where: { tenantId, status: "active" } }),
  ])
  return { employees, total, page, pageSize }
}

export function findEmployeesByDepartment(tenantId: string, departmentId: string): Promise<Employee[]> {
  return prisma.employee.findMany({
    where: { tenantId, departmentId, status: "active" },
    orderBy: { name: "asc" },
  })
}

export function countEmployees(tenantId: string): Promise<number> {
  return prisma.employee.count({ where: { tenantId, status: "active" } })
}

export function createEmployee(tenantId: string, data: CreateEmployeeInput): Promise<Employee> {
  return prisma.employee.create({
    data: {
      tenantId,
      departmentId: data.departmentId,
      name: data.name,
      phone: data.phone,
      ...(data.email !== undefined && { email: data.email }),
      ...(data.workStartTime !== undefined && { workStartTime: data.workStartTime }),
      ...(data.workEndTime !== undefined && { workEndTime: data.workEndTime }),
    },
  })
}

export function updateEmployee(
  tenantId: string,
  employeeId: string,
  data: UpdateEmployeeInput,
): Promise<{ count: number }> {
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
