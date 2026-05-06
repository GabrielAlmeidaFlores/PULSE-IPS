import { prisma } from "@/libs/db"
import type { Prisma } from "@prisma/client"
import type { AlertSeverity, AlertType, AlertWithDepartment } from "@/modules/alerts/alert.types"
import { MINIMUM_RESPONDENTS_FOR_DISPLAY } from "@/libs/utils/anonymity"

export interface CreateAlertInput {
  tenantId: string
  departmentId?: string | undefined
  type: AlertType
  severity: AlertSeverity
  message: string
}

export function findAlertsByTenant(tenantId: string): Promise<AlertWithDepartment[]> {
  return prisma.alert.findMany({
    where: { tenantId },
    include: { department: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  }) as unknown as Promise<AlertWithDepartment[]>
}

export interface AlertListingFilters {
  type?: string
  severity?: string
  status?: string
}

export async function findAlertsByTenantPaginated(
  tenantId: string,
  filters: AlertListingFilters,
  skip: number,
  take: number,
): Promise<{ alerts: AlertWithDepartment[]; total: number }> {
  const where: Prisma.AlertWhereInput = { tenantId }

  if (filters.type !== undefined) {
    where.type = filters.type
  }
  if (filters.severity !== undefined) {
    where.severity = filters.severity
  }
  if (filters.status === "resolved") {
    where.resolvedAt = { not: null }
  } else if (filters.status === "read") {
    where.isRead = true
    where.resolvedAt = null
  } else if (filters.status === "new") {
    where.isRead = false
    where.resolvedAt = null
  }

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: { department: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.alert.count({ where }),
  ])

  return { alerts: alerts as unknown as AlertWithDepartment[], total }
}

export interface AlertStats {
  total: number
  unresolved: number
  criticalUnresolved: number
  resolved: number
}

export async function findAlertStatsByTenant(tenantId: string): Promise<AlertStats> {
  const [total, unresolved, criticalUnresolved, resolved] = await Promise.all([
    prisma.alert.count({ where: { tenantId } }),
    prisma.alert.count({ where: { tenantId, resolvedAt: null } }),
    prisma.alert.count({ where: { tenantId, resolvedAt: null, severity: "critical" } }),
    prisma.alert.count({ where: { tenantId, resolvedAt: { not: null } } }),
  ])
  return { total, unresolved, criticalUnresolved, resolved }
}

export async function createAlert(data: CreateAlertInput): Promise<void> {
  await prisma.alert.create({
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

export function resolveAlert(tenantId: string, alertId: string, resolvedBy: string): Promise<{ count: number }> {
  return prisma.alert.updateMany({
    where: { id: alertId, tenantId },
    data: { resolvedAt: new Date(), isRead: true, resolvedBy },
  })
}

export interface HealthSurveyResponseWithItems {
  tenantId: string
  items: { score: number; question: { scoreDirection: string } }[]
  dispatch: {
    healthSurveyConfiguration: {
      department: {
        id: string
        name: string
      }
    }
  }
}

export function findAllTenantsRecentHealthSurveyResponsesForAlerts(since: Date): Promise<HealthSurveyResponseWithItems[]> {
  return prisma.healthSurveyResponse.findMany({
    where: { createdAt: { gte: since } },
    include: {
      items: { include: { question: { select: { scoreDirection: true } } } },
      dispatch: {
        include: {
          healthSurveyConfiguration: { include: { department: { select: { id: true, name: true } } } },
        },
      },
    },
  })
}

export function findAllTenantsResponsesInWindow(from: Date, to: Date): Promise<HealthSurveyResponseWithItems[]> {
  return prisma.healthSurveyResponse.findMany({
    where: { createdAt: { gte: from, lt: to } },
    include: {
      items: { include: { question: { select: { scoreDirection: true } } } },
      dispatch: {
        include: {
          healthSurveyConfiguration: { include: { department: { select: { id: true, name: true } } } },
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
  const configs = await prisma.healthSurveyConfiguration.findMany({
    where: { departmentId },
    include: {
      department: { select: { id: true, name: true, tenantId: true } },
      dispatches: {
        where: { status: "available" },
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
      if (dispatch.responses.length < MINIMUM_RESPONDENTS_FOR_DISPLAY) continue
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

export function hasOpenAlertOfType(tenantId: string, type: AlertType, departmentId?: string): Promise<boolean> {
  return prisma.alert.findFirst({
    where: {
      tenantId,
      type,
      resolvedAt: null,
      ...(departmentId !== undefined ? { departmentId } : {}),
    },
    select: { id: true },
  }).then((result) => result !== null)
}

export interface EmployeeWithExpiredConsentToken {
  tenantId: string
  departmentId: string
  departmentName: string
  employeeId: string
}

export async function findAllTenantsEmployeesWithExpiredConsentTokens(): Promise<EmployeeWithExpiredConsentToken[]> {
  const now = new Date()
  const expiredInvites = await prisma.employeeConsent.findMany({
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

  const activeExpiredInvites = expiredInvites.filter((c) => c.employee.status === "active")
  if (activeExpiredInvites.length === 0) return []

  const employeeIds = activeExpiredInvites.map((c) => c.employeeId)

  const laterResolutions = await prisma.employeeConsent.findMany({
    where: {
      employeeId: { in: employeeIds },
      event: { in: ["accepted", "refused", "opted_out", "revoked"] },
    },
    select: { employeeId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    distinct: ["employeeId"],
  })

  const latestResolutionByEmployee = new Map(laterResolutions.map((r) => [r.employeeId, r.createdAt]))

  return activeExpiredInvites
    .filter((c) => {
      const latestResolution = latestResolutionByEmployee.get(c.employeeId)
      return latestResolution === undefined || latestResolution < c.createdAt
    })
    .map((c) => ({
      tenantId: c.tenantId,
      departmentId: c.employee.departmentId,
      departmentName: c.employee.department.name,
      employeeId: c.employeeId,
    }))
}
