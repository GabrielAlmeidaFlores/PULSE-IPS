import { prisma } from "@/libs/db"
import type {
  HealthSurveyDispatch,
  HealthSurveyConfiguration,
  Department,
  HealthSurveyResponse,
  HealthSurveyResponseItem,
  HealthSurveyQuestion,
} from "@prisma/client"

export type ItemWithQuestion = HealthSurveyResponseItem & { question: Pick<HealthSurveyQuestion, "order" | "text" | "scoreDirection"> }

export type DispatchWithData = HealthSurveyDispatch & {
  healthSurveyConfiguration: HealthSurveyConfiguration & { department: Department }
  responses: (HealthSurveyResponse & { items: ItemWithQuestion[] })[]
}

export interface UniqueQuestion {
  order: number
  text: string
}

export function findDispatchesWithData(tenantId: string, since: Date): Promise<DispatchWithData[]> {
  return prisma.healthSurveyDispatch.findMany({
    where: {
      tenantId,
      dispatchedAt: { gte: since },
    },
    include: {
      healthSurveyConfiguration: { include: { department: true } },
      responses: {
        include: {
          items: { include: { question: { select: { order: true, text: true, scoreDirection: true } } } },
        },
      },
    },
    orderBy: { dispatchedAt: "asc" },
  })
}

export function findUniqueQuestions(tenantId: string): Promise<UniqueQuestion[]> {
  return prisma.healthSurveyQuestion.findMany({
    where: { tenantId },
    select: { order: true, text: true },
    distinct: ["order", "text"],
    orderBy: { order: "asc" },
  })
}

export function countActiveEmployees(tenantId: string): Promise<number> {
  return prisma.employee.count({ where: { tenantId, status: "active", deletedAt: null } })
}

export function countTotalResponses(tenantId: string): Promise<number> {
  return prisma.healthSurveyResponse.count({ where: { tenantId } })
}

export function countActiveAlerts(tenantId: string): Promise<number> {
  return prisma.alert.count({ where: { tenantId, resolvedAt: null } })
}

export interface DeptActiveAlert {
  type: string
  severity: string
  message: string
  createdAt: Date
}

export function findDeptDispatchesWithData(tenantId: string, deptId: string, since: Date): Promise<DispatchWithData[]> {
  return prisma.healthSurveyDispatch.findMany({
    where: {
      tenantId,
      healthSurveyConfiguration: { departmentId: deptId },
      dispatchedAt: { gte: since },
    },
    include: {
      healthSurveyConfiguration: { include: { department: true } },
      responses: {
        include: {
          items: { include: { question: { select: { order: true, text: true, scoreDirection: true } } } },
        },
      },
    },
    orderBy: { dispatchedAt: "asc" },
  })
}

export function findDeptActiveAlerts(tenantId: string, deptId: string): Promise<DeptActiveAlert[]> {
  return prisma.alert.findMany({
    where: { tenantId, departmentId: deptId, resolvedAt: null },
    select: { type: true, severity: true, message: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  })
}
