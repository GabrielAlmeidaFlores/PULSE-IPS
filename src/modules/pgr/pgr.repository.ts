import { prisma } from "@/libs/db"
import type { Prisma, PgrReview, PgrDeptResult, PgrQuestionResult, Organization, Department, Employee, HealthSurveyDispatch, HealthSurveyResponse, HealthSurveyResponseItem, HealthSurveyConfiguration, HealthSurveyQuestion, Alert } from "@prisma/client"
import type { CreatePgrReviewInput, CreatePgrDeptResultInput, CreatePgrQuestionResultInput, CreatePgrAlertInput } from "@/modules/pgr/pgr.types"

export type PgrReviewListItem = PgrReview & {
  deptResults: { avgScore: number; responseCount: number }[]
}

export type PgrReviewWithResults = PgrReview & {
  deptResults: PgrDeptResult[]
  questionResults: PgrQuestionResult[]
}

export function findPgrReviewsByTenant(tenantId: string): Promise<PgrReviewListItem[]> {
  return prisma.pgrReview.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      deptResults: { select: { avgScore: true, responseCount: true } },
    },
  })
}

export interface PgrReviewListFilters {
  year?: string
  status?: string
}

export async function findPgrReviewsByTenantPaginated(
  tenantId: string,
  filters: PgrReviewListFilters,
  skip: number,
  take: number,
): Promise<{ items: PgrReviewListItem[]; total: number }> {
  const where: Prisma.PgrReviewWhereInput = { tenantId }
  if (filters.year !== undefined) where.period = { startsWith: filters.year }
  if (filters.status !== undefined) where.status = filters.status

  const [items, total] = await prisma.$transaction([
    prisma.pgrReview.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        deptResults: { select: { avgScore: true, responseCount: true } },
      },
    }),
    prisma.pgrReview.count({ where }),
  ])
  return { items, total }
}

export function findPgrReviewById(tenantId: string, id: string): Promise<PgrReviewWithResults | null> {
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
        include: { employees: { where: { status: "active", deletedAt: null } } },
      },
    },
  })
}

export function findDispatchesForPgr(tenantId: string): Promise<(HealthSurveyDispatch & { responses: (HealthSurveyResponse & { items: HealthSurveyResponseItem[] })[]; healthSurveyConfiguration: HealthSurveyConfiguration & { department: Department; departmentId: string; questions: HealthSurveyQuestion[] } })[]> {
  return prisma.healthSurveyDispatch.findMany({
    where: { tenantId, status: "available" },
    include: {
      responses: { include: { items: true } },
      healthSurveyConfiguration: {
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

export function findAllTenantsUpcomingPgrReviews(reminderDate: Date, reminderDateEnd: Date): Promise<(PgrReview & { organization: Organization })[]> {
  return prisma.pgrReview.findMany({
    where: { nextReviewAt: { gte: reminderDate, lt: reminderDateEnd } },
    include: { organization: true },
  })
}

export function findExistingPgrAlert(tenantId: string): Promise<Alert | null> {
  return prisma.alert.findFirst({
    where: { tenantId, type: "pgr_review_due", resolvedAt: null },
  })
}

export async function createPgrAlert(data: CreatePgrAlertInput): Promise<void> {
  await prisma.alert.create({ data })
}

export function updatePgrReviewStatus(tenantId: string, id: string, status: "reviewed"): Promise<PgrReview> {
  return prisma.pgrReview.update({
    where: { id, tenantId },
    data: { status },
  })
}

export function findPgrReviewByTenantAndPeriod(tenantId: string, period: string): Promise<PgrReview | null> {
  return prisma.pgrReview.findFirst({ where: { tenantId, period } })
}

export function createPgrReviewAtomic(
  reviewData: CreatePgrReviewInput,
  deptResults: CreatePgrDeptResultInput[],
  questionResults: CreatePgrQuestionResultInput[],
): Promise<PgrReview> {
  return prisma.$transaction(async (tx) => {
    const review = await tx.pgrReview.create({
      data: {
        tenantId: reviewData.tenantId,
        period: reviewData.period,
        status: reviewData.status,
        reviewedAt: reviewData.reviewedAt,
      },
    })
    const resultsWithId = deptResults.map((r) => ({ ...r, pgrReviewId: review.id }))
    await tx.pgrDeptResult.createMany({ data: resultsWithId })
    if (questionResults.length > 0) {
      const questionResultsWithId = questionResults.map((r) => ({ ...r, pgrReviewId: review.id }))
      await tx.pgrQuestionResult.createMany({ data: questionResultsWithId })
    }
    return review
  })
}

export function replacePgrReviewAtomic(
  existingId: string,
  reviewData: CreatePgrReviewInput,
  deptResults: CreatePgrDeptResultInput[],
  questionResults: CreatePgrQuestionResultInput[],
): Promise<PgrReview> {
  return prisma.$transaction(async (tx) => {
    await tx.pgrReview.delete({ where: { id: existingId, tenantId: reviewData.tenantId } })
    const review = await tx.pgrReview.create({
      data: {
        tenantId: reviewData.tenantId,
        period: reviewData.period,
        status: reviewData.status,
        reviewedAt: reviewData.reviewedAt,
      },
    })
    const resultsWithId = deptResults.map((r) => ({ ...r, pgrReviewId: review.id }))
    await tx.pgrDeptResult.createMany({ data: resultsWithId })
    if (questionResults.length > 0) {
      const questionResultsWithId = questionResults.map((r) => ({ ...r, pgrReviewId: review.id }))
      await tx.pgrQuestionResult.createMany({ data: questionResultsWithId })
    }
    return review
  })
}

interface RawItemScore {
  questionId: string
  score: number
  departmentId: string
}

export async function findItemScoresForPeriod(
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<RawItemScore[]> {
  const items = await prisma.healthSurveyResponseItem.findMany({
    where: {
      healthSurveyResponse: {
        tenantId,
        dispatch: { dispatchedAt: { gte: startDate, lt: endDate } },
      },
    },
    select: {
      questionId: true,
      score: true,
      healthSurveyResponse: {
        select: {
          dispatch: {
            select: { healthSurveyConfiguration: { select: { departmentId: true } } },
          },
        },
      },
    },
  })
  return items.map((item) => ({
    questionId: item.questionId,
    score: item.score,
    departmentId: item.healthSurveyResponse.dispatch.healthSurveyConfiguration.departmentId,
  }))
}
