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

export function findRecentSurveyResponsesForAlerts(since: Date): Promise<SurveyResponseWithItems[]> {
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
