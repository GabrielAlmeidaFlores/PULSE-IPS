import { prisma } from "@/libs/db"
import type { Prisma } from "@prisma/client"
import type { AnonymousReport, CreateAnonymousReportInput, UpdateAnonymousReportInput } from "@/modules/anonymous-reports/anonymous-report.types"

export function findReportsByTenant(tenantId: string): Promise<AnonymousReport[]> {
  return prisma.anonymousReport.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  }) as unknown as Promise<AnonymousReport[]>
}

export function findReportById(tenantId: string, reportId: string): Promise<AnonymousReport | null> {
  return prisma.anonymousReport.findFirst({ where: { id: reportId, tenantId } }) as unknown as Promise<AnonymousReport | null>
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
  }) as unknown as Promise<AnonymousReport>
}

export function updateReport(
  tenantId: string,
  reportId: string,
  data: UpdateAnonymousReportInput,
): Promise<{ count: number }> {
  return prisma.anonymousReport.updateMany({ where: { id: reportId, tenantId }, data })
}

export interface AnonymousReportListingFilters {
  status?: string
  category?: string
}

export async function findReportsForListingPage(
  tenantId: string,
  filters: AnonymousReportListingFilters,
  skip: number,
  take: number,
): Promise<{ items: AnonymousReport[]; total: number }> {
  const where: Prisma.AnonymousReportWhereInput = { tenantId }
  if (filters.status !== undefined) {
    where.status = filters.status
  }
  if (filters.category !== undefined) {
    where.category = filters.category
  }
  const [items, total] = await Promise.all([
    prisma.anonymousReport.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.anonymousReport.count({ where }),
  ])
  return { items: items as unknown as AnonymousReport[], total }
}
