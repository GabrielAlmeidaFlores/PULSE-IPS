import { prisma } from "@/libs/db"
import type { PgrReview, Organization, Department, Employee, SurveyDispatch, SurveyResponse, SurveyResponseItem, SurveyConfiguration, Alert } from "@prisma/client"
import type { CreatePgrReviewInput, CreatePgrAlertInput } from "@/modules/pgr/pgr.types"

export function findPgrReviewsByTenant(tenantId: string): Promise<PgrReview[]> {
  return prisma.pgrReview.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  })
}

export function findOrgWithDepartmentsForPgr(tenantId: string): Promise<Organization & { departments: (Department & { employees: Employee[] })[] }> {
  return prisma.organization.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      departments: {
        where: { isActive: true },
        include: { employees: { where: { status: "active" } } },
      },
    },
  })
}

export function findDispatchesForPgr(tenantId: string): Promise<(SurveyDispatch & { responses: (SurveyResponse & { items: SurveyResponseItem[] })[]; surveyConfiguration: SurveyConfiguration & { department: Department; departmentId: string } })[]> {
  return prisma.surveyDispatch.findMany({
    where: { tenantId, status: "dispatched" },
    include: {
      responses: { include: { items: true } },
      surveyConfiguration: { include: { department: true } },
    },
  })
}

export function createPgrReview(data: CreatePgrReviewInput): Promise<PgrReview> {
  return prisma.pgrReview.create({ data })
}

export function findUpcomingPgrReviews(reminderDate: Date, reminderDateEnd: Date): Promise<(PgrReview & { organization: Organization })[]> {
  return prisma.pgrReview.findMany({
    where: { nextReviewAt: { gte: reminderDate, lt: reminderDateEnd } },
    include: { organization: true },
  })
}

export function findExistingPgrAlert(tenantId: string): Promise<Alert | null> {
  return prisma.alert.findFirst({
    where: { tenantId, type: "pgr_review_due", isRead: false },
  })
}

export async function createPgrAlert(data: CreatePgrAlertInput): Promise<void> {
  await prisma.alert.create({ data })
}
