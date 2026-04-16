import { AppError } from "@/libs/errors/app-error"
import {
  findReportsByTenant,
  findReportById,
  createReport,
  updateReport,
} from "@/modules/anonymous-reports/anonymous-report.repository"
import { findOrganizationBySlug } from "@/modules/organizations/organization.repository"
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

export function updateReportStatus(
  tenantId: string,
  reportId: string,
  input: UpdateAnonymousReportInput,
): ReturnType<typeof updateReport> {
  const data = {
    ...input,
    ...(input.status === "resolved" ? { resolvedAt: new Date() } : {}),
  }
  return updateReport(tenantId, reportId, data)
}
