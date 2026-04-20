import { addDays } from "date-fns"
import type { PgrReview } from "@prisma/client"
import type { CreatePgrDeptResultInput, CreatePgrQuestionResultInput } from "@/modules/pgr/pgr.types"
import {
  type PgrReviewWithResults,
  findPgrReviewsByTenant,
  findPgrReviewById,
  findOrgWithDepartmentsForPgr,
  findDispatchesForPgr,
  createPgrReview,
  createPgrDeptResults,
  createPgrQuestionResults,
  findUpcomingPgrReviews,
  findExistingPgrAlert,
  createPgrAlert,
} from "@/modules/pgr/pgr.repository"

export type { PgrReviewWithResults }

export function getPgrReviews(tenantId: string): Promise<PgrReview[]> {
  return findPgrReviewsByTenant(tenantId)
}

export function getPgrReviewById(id: string, tenantId: string): Promise<PgrReviewWithResults | null> {
  return findPgrReviewById(id, tenantId)
}

interface DispatchLike {
  surveyConfiguration: {
    departmentId: string
    questions?: { id: string; text: string; order: number }[] | null
  }
  responses: { items: { questionId: string; score: number }[] }[]
}

function buildDeptQuestionResults(
  reviewId: string,
  deptId: string,
  deptDispatches: DispatchLike[],
): CreatePgrQuestionResultInput[] {
  const qMap = new Map<string, { text: string; order: number; scores: number[] }>()
  for (const dispatch of deptDispatches) {
    for (const q of dispatch.surveyConfiguration.questions ?? []) {
      if (!qMap.has(q.id)) qMap.set(q.id, { text: q.text, order: q.order, scores: [] })
    }
    for (const response of dispatch.responses) {
      for (const item of response.items) {
        qMap.get(item.questionId)?.scores.push(item.score)
      }
    }
  }
  const results: CreatePgrQuestionResultInput[] = []
  for (const [questionId, v] of qMap.entries()) {
    if (v.scores.length > 0) {
      results.push({
        pgrReviewId: reviewId,
        departmentId: deptId,
        questionId,
        questionText: v.text,
        questionOrder: v.order,
        avgScore: v.scores.reduce((s, x) => s + x, 0) / v.scores.length,
        responseCount: v.scores.length,
      })
    }
  }
  return results
}

export async function generatePgrReport(tenantId: string, period: string): Promise<void> {
  const org = await findOrgWithDepartmentsForPgr(tenantId)
  const dispatches = await findDispatchesForPgr(tenantId)

  const [periodYear, periodMonth] = period.split("-").map(Number)
  const periodDispatches = dispatches.filter((d) => {
    if (!d.dispatchedAt) return false
    const dt = new Date(d.dispatchedAt)
    return dt.getFullYear() === periodYear && dt.getMonth() + 1 === periodMonth
  })
  const targetDispatches = periodDispatches.length > 0 ? periodDispatches : dispatches

  const review = await createPgrReview({
    tenantId,
    period,
    status: "generated",
    reviewedAt: new Date(),
  })

  const deptResults: CreatePgrDeptResultInput[] = org.departments.map((dept) => {
    const deptDispatches = targetDispatches.filter(
      (d) => d.surveyConfiguration.departmentId === dept.id,
    )
    const allResponses = deptDispatches.flatMap((d) => d.responses)
    const allItems = allResponses.flatMap((r) => r.items)
    const avgScore =
      allItems.length > 0
        ? allItems.reduce((sum, item) => sum + item.score, 0) / allItems.length
        : 0
    const totalRecipients = deptDispatches.reduce((sum, d) => sum + d.totalRecipients, 0)

    return {
      pgrReviewId: review.id,
      departmentId: dept.id,
      departmentName: dept.name,
      employeeCount: dept.employees.length,
      avgScore,
      responseCount: allResponses.length,
      totalRecipients,
    }
  })

  await createPgrDeptResults(deptResults)

  const questionResults = org.departments.flatMap((dept) =>
    buildDeptQuestionResults(
      review.id,
      dept.id,
      targetDispatches.filter((d) => d.surveyConfiguration.departmentId === dept.id),
    ),
  )

  if (questionResults.length > 0) {
    await createPgrQuestionResults(questionResults)
  }
}

export async function sendPgrReviewReminders(): Promise<{ remindersCreated: number }> {
  const DAYS_BEFORE_REVIEW = 30
  const reminderDate = addDays(new Date(), DAYS_BEFORE_REVIEW)
  reminderDate.setHours(0, 0, 0, 0)
  const reminderDateEnd = addDays(reminderDate, 1)

  const upcomingReviews = await findUpcomingPgrReviews(reminderDate, reminderDateEnd)
  let remindersCreated = 0

  for (const review of upcomingReviews) {
    const existingAlert = await findExistingPgrAlert(review.tenantId)
    if (!existingAlert) {
      await createPgrAlert({
        tenantId: review.tenantId,
        type: "pgr_review_due",
        severity: "warning",
        message: `Revisão PGR prevista para ${review.nextReviewAt?.toLocaleDateString("pt-BR") ?? "em breve"}.`,
      })
      remindersCreated++
    }
  }

  return { remindersCreated }
}
