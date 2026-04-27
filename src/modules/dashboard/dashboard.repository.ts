import { prisma } from "@/libs/db"
import type {
  SurveyDispatch,
  SurveyConfiguration,
  Department,
  SurveyResponse,
  SurveyResponseItem,
  SurveyQuestion,
} from "@prisma/client"

export type ItemWithQuestion = SurveyResponseItem & { question: Pick<SurveyQuestion, "order" | "text" | "scoreDirection"> }

export type DispatchWithData = SurveyDispatch & {
  surveyConfiguration: SurveyConfiguration & { department: Department }
  responses: (SurveyResponse & { items: ItemWithQuestion[] })[]
}

export interface UniqueQuestion {
  order: number
  text: string
}

export function findDispatchesWithData(tenantId: string, since: Date): Promise<DispatchWithData[]> {
  return prisma.surveyDispatch.findMany({
    where: {
      tenantId,
      dispatchedAt: { gte: since },
    },
    include: {
      surveyConfiguration: { include: { department: true } },
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
  return prisma.surveyQuestion.findMany({
    where: { tenantId },
    select: { order: true, text: true },
    distinct: ["order", "text"],
    orderBy: { order: "asc" },
  })
}

export function countActiveEmployees(tenantId: string): Promise<number> {
  return prisma.employee.count({ where: { tenantId, status: "active" } })
}

export function countTotalResponses(tenantId: string): Promise<number> {
  return prisma.surveyResponse.count({ where: { tenantId } })
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
  return prisma.surveyDispatch.findMany({
    where: {
      tenantId,
      surveyConfiguration: { departmentId: deptId },
      dispatchedAt: { gte: since },
    },
    include: {
      surveyConfiguration: { include: { department: true } },
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
