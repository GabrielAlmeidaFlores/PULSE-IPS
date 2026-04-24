import { prisma } from "@/libs/db"
import type { Alert } from "@prisma/client"
import type { AlertSeverity, AlertType } from "@/modules/alerts/alert.types"

export interface CreateAlertInput {
  tenantId: string
  departmentId?: string | undefined
  type: AlertType
  severity: AlertSeverity
  message: string
}

export function findAlertsByTenant(tenantId: string): Promise<(Alert & { department: import("@prisma/client").Department | null })[]> {
  return prisma.alert.findMany({
    where: { tenantId },
    include: { department: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
}

export function createAlert(data: CreateAlertInput): Promise<Alert> {
  return prisma.alert.create({
    data: {
      tenantId: data.tenantId,
      type: data.type,
      severity: data.severity,
      message: data.message,
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
    },
  })
}

export function markAlertRead(tenantId: string, alertId: string): Promise<{ count: number }> {
  return prisma.alert.updateMany({
    where: { id: alertId, tenantId },
    data: { isRead: true },
  })
}

export function resolveAlert(tenantId: string, alertId: string): Promise<{ count: number }> {
  return prisma.alert.updateMany({
    where: { id: alertId, tenantId },
    data: { resolvedAt: new Date(), isRead: true },
  })
}

export interface SurveyResponseWithItems {
  tenantId: string
  items: { score: number; question: { scoreDirection: string } }[]
  dispatch: {
    surveyConfiguration: {
      department: {
        id: string
        name: string
      }
    }
  }
}

export function findAllTenantsRecentSurveyResponsesForAlerts(since: Date): Promise<SurveyResponseWithItems[]> {
  return prisma.surveyResponse.findMany({
    where: { createdAt: { gte: since } },
    include: {
      items: { include: { question: { select: { scoreDirection: true } } } },
      dispatch: {
        include: {
          surveyConfiguration: { include: { department: { select: { id: true, name: true } } } },
        },
      },
    },
  })
}

export function findAllTenantsResponsesInWindow(from: Date, to: Date): Promise<SurveyResponseWithItems[]> {
  return prisma.surveyResponse.findMany({
    where: { createdAt: { gte: from, lt: to } },
    include: {
      items: { include: { question: { select: { scoreDirection: true } } } },
      dispatch: {
        include: {
          surveyConfiguration: { include: { department: { select: { id: true, name: true } } } },
        },
      },
    },
  })
}

export interface DeptDispatchAvg {
  tenantId: string
  departmentId: string
  departmentName: string
  dispatchId: string
  avgScore: number
  createdAt: Date
}

export async function findAllTenantsDeptRecentDispatchAvgs(departmentId: string, limitPerDept: number): Promise<DeptDispatchAvg[]> {
  const configs = await prisma.surveyConfiguration.findMany({
    where: { departmentId },
    include: {
      department: { select: { id: true, name: true, tenantId: true } },
      dispatches: {
        where: { status: "sent" },
        orderBy: { createdAt: "desc" },
        take: limitPerDept,
        include: {
          responses: {
            include: {
              items: { include: { question: { select: { scoreDirection: true } } } },
            },
          },
        },
      },
    },
  })

  const results: DeptDispatchAvg[] = []
  for (const config of configs) {
    for (const dispatch of config.dispatches) {
      if (dispatch.responses.length === 0) continue
      const allScores = dispatch.responses.flatMap((r) =>
        r.items.map((item) =>
          item.question.scoreDirection === "lower_is_better" ? 6 - item.score : item.score,
        ),
      )
      const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length
      results.push({
        tenantId: config.department.tenantId,
        departmentId: config.department.id,
        departmentName: config.department.name,
        dispatchId: dispatch.id,
        avgScore,
        createdAt: dispatch.createdAt,
      })
    }
  }
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limitPerDept)
}

export function findAllTenantsActiveDepartments(): Promise<{ id: string; tenantId: string; name: string }[]> {
  return prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, tenantId: true, name: true },
  })
}

export interface EmployeeWithExpiredConsentToken {
  tenantId: string
  departmentId: string
  departmentName: string
  employeeId: string
}

export async function findAllTenantsEmployeesWithExpiredConsentTokens(): Promise<EmployeeWithExpiredConsentToken[]> {
  const now = new Date()
  const consents = await prisma.employeeConsent.findMany({
    where: {
      event: "invited",
      tokenExpiresAt: { lt: now },
    },
    include: {
      employee: {
        include: {
          department: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    distinct: ["employeeId"],
  })

  return consents
    .filter((c) => c.employee.status === "active")
    .map((c) => ({
      tenantId: c.tenantId,
      departmentId: c.employee.departmentId,
      departmentName: c.employee.department.name,
      employeeId: c.employeeId,
    }))
}
