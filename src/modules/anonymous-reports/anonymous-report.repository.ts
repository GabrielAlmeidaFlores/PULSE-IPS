import { prisma } from "@/libs/db"
import type { AnonymousReport } from "@prisma/client"
import type { CreateAnonymousReportInput, UpdateAnonymousReportInput } from "@/modules/anonymous-reports/anonymous-report.types"

export function findReportsByTenant(tenantId: string): Promise<AnonymousReport[]> {
  return prisma.anonymousReport.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  })
}

export function findReportById(tenantId: string, reportId: string): Promise<AnonymousReport | null> {
  return prisma.anonymousReport.findFirst({ where: { id: reportId, tenantId } })
}

export function createReport(
  tenantId: string,
  data: CreateAnonymousReportInput,
): Promise<AnonymousReport> {
  return prisma.anonymousReport.create({
    data: {
      tenantId,
      orgSlug: data.orgSlug,
      content: data.content,
      ...(data.category !== undefined && { category: data.category }),
    },
  })
}

export function updateReport(
  tenantId: string,
  reportId: string,
  data: UpdateAnonymousReportInput,
): Promise<{ count: number }> {
  return prisma.anonymousReport.updateMany({ where: { id: reportId, tenantId }, data })
}
