import { prisma } from "@/libs/db"
import type { Prisma } from "@prisma/client"
import type { AlertSeverity, AlertType, AlertWithDepartment } from "@/modules/alerts/alert.types"
import { formatInTimeZone } from "date-fns-tz"
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
  departmentId: string | null
  items: { score: number; question: { scoreDirection: string } }[]
  dispatch: {
    healthSurveyConfiguration: {
      configDepartments: { department: { id: string; name: string } }[]
    }
  }
}

export function findAllTenantsRecentHealthSurveyResponsesForAlerts(since: Date): Promise<HealthSurveyResponseWithItems[]> {
  return prisma.healthSurveyResponse.findMany({
    where: { createdAt: { gte: since }, organization: { billingStatus: { in: ["active", "trialing"] } } },
    include: {
      items: { include: { question: { select: { scoreDirection: true } } } },
      dispatch: {
        include: {
          healthSurveyConfiguration: { include: { configDepartments: { include: { department: { select: { id: true, name: true } } } } } },
        },
      },
    },
  }) as unknown as Promise<HealthSurveyResponseWithItems[]>
}

export function findAllTenantsResponsesInWindow(from: Date, to: Date): Promise<HealthSurveyResponseWithItems[]> {
  return prisma.healthSurveyResponse.findMany({
    where: { createdAt: { gte: from, lt: to }, organization: { billingStatus: { in: ["active", "trialing"] } } },
    include: {
      items: { include: { question: { select: { scoreDirection: true } } } },
      dispatch: {
        include: {
          healthSurveyConfiguration: { include: { configDepartments: { include: { department: { select: { id: true, name: true } } } } } },
        },
      },
    },
  }) as unknown as Promise<HealthSurveyResponseWithItems[]>
}

export interface DeptDispatchAvg {
  tenantId: string
  departmentId: string
  departmentName: string
  avgScore: number
  effectiveDate: Date
}

interface DispatchWithResponses {
  createdAt: Date
  dispatchedAt: Date | null
  responses: { items: { score: number; question: { scoreDirection: string } }[] }[]
}

function accumulateDayScores(
  dayMap: Map<string, { scores: number[]; responseCount: number; effectiveDate: Date }>,
  dispatch: DispatchWithResponses,
  timezone: string,
): void {
  const effectiveDate = dispatch.dispatchedAt ?? dispatch.createdAt
  const dayKey = formatInTimeZone(effectiveDate, timezone, "yyyy-MM-dd")
  const existing = dayMap.get(dayKey) ?? { scores: [], responseCount: 0, effectiveDate }
  for (const r of dispatch.responses) {
    for (const item of r.items) {
      existing.scores.push(item.question.scoreDirection === "lower_is_better" ? 6 - item.score : item.score)
    }
  }
  existing.responseCount += dispatch.responses.length
  dayMap.set(dayKey, existing)
}

export async function findAllTenantsDeptRecentDispatchAvgs(departmentId: string, limitPerDept: number): Promise<DeptDispatchAvg[]> {
  const DISPATCHES_PER_CONFIG_SAFETY_FACTOR = 3
  const configs = await prisma.healthSurveyConfiguration.findMany({
    where: { configDepartments: { some: { departmentId } } },
    include: {
      configDepartments: { where: { departmentId }, include: { department: { select: { id: true, name: true, tenantId: true } } } },
      organization: { select: { timezone: true } },
      dispatches: {
        where: { status: "available" },
        orderBy: { createdAt: "desc" },
        take: limitPerDept * DISPATCHES_PER_CONFIG_SAFETY_FACTOR,
        include: {
          responses: {
            where: { departmentId },
            include: {
              items: { include: { question: { select: { scoreDirection: true } } } },
            },
          },
        },
      },
    },
  })

  if (configs.length === 0) return []

  const dept = configs[0]?.configDepartments[0]?.department
  if (!dept) return []

  const dayMap = new Map<string, { scores: number[]; responseCount: number; effectiveDate: Date }>()

  for (const config of configs) {
    const configTimezone = config.organization?.timezone ?? "America/Sao_Paulo"
    for (const dispatch of config.dispatches) {
      accumulateDayScores(dayMap, { ...dispatch, dispatchedAt: dispatch.dispatchedAt }, configTimezone)
    }
  }

  const results: DeptDispatchAvg[] = []
  for (const [, data] of Array.from(dayMap.entries())) {
    if (data.responseCount < MINIMUM_RESPONDENTS_FOR_DISPLAY) continue
    if (data.scores.length === 0) continue
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length
    results.push({
      tenantId: dept.tenantId,
      departmentId: dept.id,
      departmentName: dept.name,
      avgScore,
      effectiveDate: data.effectiveDate,
    })
  }
  return results.sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime()).slice(0, limitPerDept)
}

export function findAllTenantsActiveDepartments(): Promise<{ id: string; tenantId: string; name: string }[]> {
  return prisma.department.findMany({
    where: { isActive: true, organization: { billingStatus: { in: ["active", "trialing"] } } },
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

export async function findAllTenantsOpenAlertDepartmentIdsByType(type: AlertType): Promise<Set<string>> {
  const alerts = await prisma.alert.findMany({
    where: { type, resolvedAt: null, departmentId: { not: null } },
    select: { departmentId: true },
  })
  return new Set(alerts.map((a) => a.departmentId).filter((id): id is string => id !== null))
}
