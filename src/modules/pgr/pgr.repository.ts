import { prisma } from "@/libs/db"
import type { PgrReview, PgrDeptResult, PgrQuestionResult, Organization, Department, Employee, SurveyDispatch, SurveyResponse, SurveyResponseItem, SurveyConfiguration, SurveyQuestion, Alert } from "@prisma/client"
import type { CreatePgrReviewInput, CreatePgrDeptResultInput, CreatePgrQuestionResultInput, CreatePgrAlertInput } from "@/modules/pgr/pgr.types"

export type PgrReviewWithResults = PgrReview & {
  deptResults: PgrDeptResult[]
  questionResults: PgrQuestionResult[]
}

export function findPgrReviewsByTenant(tenantId: string): Promise<PgrReview[]> {
  return prisma.pgrReview.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  })
}

export function findPgrReviewById(id: string, tenantId: string): Promise<PgrReviewWithResults | null> {
  return prisma.pgrReview.findFirst({
    where: { id, tenantId },
    include: {
      deptResults: { orderBy: { avgScore: "desc" } },
      questionResults: { orderBy: { questionOrder: "asc" } },
    },
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

export function findDispatchesForPgr(tenantId: string): Promise<(SurveyDispatch & { responses: (SurveyResponse & { items: SurveyResponseItem[] })[]; surveyConfiguration: SurveyConfiguration & { department: Department; departmentId: string; questions: SurveyQuestion[] } })[]> {
  return prisma.surveyDispatch.findMany({
    where: { tenantId, status: { in: ["dispatched", "completed"] } },
    include: {
      responses: { include: { items: true } },
      surveyConfiguration: {
        include: {
          department: true,
          questions: { orderBy: { order: "asc" } },
        },
      },
    },
  })
}

export function createPgrReview(data: CreatePgrReviewInput): Promise<PgrReview> {
  return prisma.pgrReview.create({
    data: {
      tenantId: data.tenantId,
      period: data.period,
      status: data.status,
      reviewedAt: data.reviewedAt,
    },
  })
}

export async function createPgrDeptResults(results: CreatePgrDeptResultInput[]): Promise<void> {
  await prisma.pgrDeptResult.createMany({ data: results })
}

export async function createPgrQuestionResults(results: CreatePgrQuestionResultInput[]): Promise<void> {
  await prisma.pgrQuestionResult.createMany({ data: results })
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
