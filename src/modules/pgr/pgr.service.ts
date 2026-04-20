import { addDays } from "date-fns"
import type { PgrReview } from "@prisma/client"
import type { CreatePgrDeptResultInput, CreatePgrQuestionResultInput } from "@/modules/pgr/pgr.types"
import type { ScoreDirection } from "@/modules/surveys/survey.types"
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
    questions?: { id: string; text: string; order: number; scoreDirection?: string | null }[] | null
  }
  responses: { items: { questionId: string; score: number }[] }[]
}

interface QuestionMapEntry { text: string; order: number; scoreDirection: ScoreDirection; scores: number[] }

function normalizeItemScore(score: number, direction: string): number {
  return direction === "lower_is_better" ? 6 - score : score
}

function registerQuestionsInMap(
  qMap: Map<string, QuestionMapEntry>,
  questions: { id: string; text: string; order: number; scoreDirection?: string | null }[],
): void {
  for (const q of questions) {
    if (!qMap.has(q.id)) {
      qMap.set(q.id, { text: q.text, order: q.order, scoreDirection: (q.scoreDirection ?? "higher_is_better") as ScoreDirection, scores: [] })
    }
  }
}

function collectResponseScores(qMap: Map<string, QuestionMapEntry>, responses: DispatchLike["responses"]): void {
  for (const response of responses) {
    for (const item of response.items) {
      const entry = qMap.get(item.questionId)
      if (entry) entry.scores.push(normalizeItemScore(item.score, entry.scoreDirection))
    }
  }
}

function buildDeptQuestionResults(
  reviewId: string,
  deptId: string,
  deptDispatches: DispatchLike[],
): CreatePgrQuestionResultInput[] {
  const qMap: Map<string, QuestionMapEntry> = new Map()
  for (const dispatch of deptDispatches) {
    registerQuestionsInMap(qMap, dispatch.surveyConfiguration.questions ?? [])
    collectResponseScores(qMap, dispatch.responses)
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
        scoreDirection: v.scoreDirection,
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
    const questionDirections = new Map(
      deptDispatches.flatMap((d) => d.surveyConfiguration.questions.map((q) => [q.id, q.scoreDirection ?? "higher_is_better"])),
    )
    const allItems = allResponses.flatMap((r) => r.items)
    const avgScore =
      allItems.length > 0
        ? allItems.reduce((sum, item) => {
            const dir = questionDirections.get(item.questionId) ?? "higher_is_better"
            return sum + (dir === "lower_is_better" ? 6 - item.score : item.score)
          }, 0) / allItems.length
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
