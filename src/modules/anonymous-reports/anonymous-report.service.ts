import { AppError } from "@/libs/errors/app-error"
import {
  findReportsByTenant,
  findReportById,
  findReportsForListingPage,
  createReport,
  updateReport,
  type AnonymousReportListingFilters,
} from "@/modules/anonymous-reports/anonymous-report.repository"
import { findOrganizationBySlug } from "@/modules/organizations/organization.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"
import type { CreateAnonymousReportInput, UpdateAnonymousReportInput } from "@/modules/anonymous-reports/anonymous-report.types"

export function getReports(tenantId: string): ReturnType<typeof findReportsByTenant> {
  return findReportsByTenant(tenantId)
}

export function getReport(tenantId: string, reportId: string): ReturnType<typeof findReportById> {
  return findReportById(tenantId, reportId)
}

export async function submitReport(orgSlug: string, input: CreateAnonymousReportInput): ReturnType<typeof createReport> {
  const org = await findOrganizationBySlug(orgSlug)
  if (!org) throw new AppError("ORGANIZATION_NOT_FOUND", "Organização não encontrada.")
  return createReport(org.id, { ...input, orgSlug })
}

export async function updateReportStatus(
  tenantId: string,
  reportId: string,
  input: UpdateAnonymousReportInput,
  actorId?: string,
): ReturnType<typeof updateReport> {
  const data = {
    ...input,
    resolvedAt: input.status === "resolved" ? new Date() : null,
  }
  const result = await updateReport(tenantId, reportId, data)
  await createAuditLog({ tenantId, ...(actorId !== undefined ? { userId: actorId } : {}), action: "anonymous_report.status_updated", resource: "anonymous_reports", resourceId: reportId, metadata: { status: input.status ?? null } })
  return result
}

interface AnonymousReportListingQuery {
  status?: string
  category?: string
  page: number
  pageSize: number
}

export function getReportsPaginated(
  tenantId: string,
  query: AnonymousReportListingQuery,
): ReturnType<typeof findReportsForListingPage> {
  const skip = (query.page - 1) * query.pageSize
  const filters: AnonymousReportListingFilters = {}
  if (query.status !== undefined) filters.status = query.status
  if (query.category !== undefined) filters.category = query.category
  return findReportsForListingPage(tenantId, filters, skip, query.pageSize)
}
