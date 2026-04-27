import { addDays } from "date-fns"
import { MINIMUM_RESPONDENTS_FOR_DISPLAY } from "@/libs/utils/anonymity"
import type { PgrReview, PgrQuestionResult } from "@prisma/client"
import type { CreatePgrDeptResultInput, CreatePgrQuestionResultInput, PgrScoreDistribution } from "@/modules/pgr/pgr.types"
import type { ScoreDirection } from "@/modules/surveys/survey.types"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import {
  type PgrReviewWithResults,
  type PgrReviewListItem,
  findPgrReviewsByTenant,
  findPgrReviewById,
  findOrgWithDepartmentsForPgr,
  findDispatchesForPgr,
  createPgrReview,
  createPgrDeptResults,
  createPgrQuestionResults,
  findAllTenantsUpcomingPgrReviews,
  findExistingPgrAlert,
  createPgrAlert,
  findItemScoresForPeriod,
  updatePgrReviewStatus,
} from "@/modules/pgr/pgr.repository"
import { toHealthIndex } from "@/libs/utils/health-index"

export type { PgrReviewWithResults, PgrScoreDistribution }

export interface PgrReviewSummary extends PgrReview {
  overallHealthIndex: number | null
}

function computeOverallHealthIndex(deptResults: { avgScore: number }[]): number | null {
  const scoredDepts = deptResults.filter((d) => d.avgScore > 0)
  if (scoredDepts.length === 0) return null
  const simpleAvg = scoredDepts.reduce((s, d) => s + d.avgScore, 0) / scoredDepts.length
  return toHealthIndex(simpleAvg)
}

function toSummary(review: PgrReviewListItem): PgrReviewSummary {
  const { deptResults, ...base } = review
  return { ...base, overallHealthIndex: computeOverallHealthIndex(deptResults) }
}

export function getPgrReviews(tenantId: string): Promise<PgrReviewSummary[]> {
  return findPgrReviewsByTenant(tenantId).then((list) => list.map(toSummary))
}

export function getPgrReviewById(tenantId: string, id: string): Promise<PgrReviewWithResults | null> {
  return findPgrReviewById(tenantId, id)
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
    if (v.scores.length >= MINIMUM_RESPONDENTS_FOR_DISPLAY) {
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

  const upcomingReviews = await findAllTenantsUpcomingPgrReviews(reminderDate, reminderDateEnd)
  let remindersCreated = 0

  for (const review of upcomingReviews) {
    const hasPgrFeature = await hasTenantPlanFeature(review.tenantId, "pgr")
    if (!hasPgrFeature) continue

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

export async function markPgrReviewAsReviewed(tenantId: string, id: string): Promise<void> {
  await updatePgrReviewStatus(tenantId, id, "reviewed")
}

export async function getPgrScoreDistributions(
  tenantId: string,
  period: string,
  questionResults: PgrQuestionResult[],
): Promise<PgrScoreDistribution[]> {
  const [yearStr, monthStr] = period.split("-")
  const startDate = new Date(Number(yearStr), Number(monthStr) - 1, 1)
  const endDate = new Date(Number(yearStr), Number(monthStr), 1)

  const rawItems = await findItemScoresForPeriod(tenantId, startDate, endDate)

  const distMap = new Map<string, Map<number, number>>()
  for (const item of rawItems) {
    const key = `${item.questionId}||${item.departmentId}`
    let scoreMap = distMap.get(key)
    if (scoreMap === undefined) {
      scoreMap = new Map<number, number>()
      distMap.set(key, scoreMap)
    }
    scoreMap.set(item.score, (scoreMap.get(item.score) ?? 0) + 1)
  }

  return questionResults.map((qr) => {
    const key = `${qr.questionId}||${qr.departmentId}`
    const scoreMap = distMap.get(key) ?? new Map<number, number>()
    return {
      questionId: qr.questionId,
      questionText: qr.questionText,
      questionOrder: qr.questionOrder,
      scoreDirection: qr.scoreDirection as ScoreDirection,
      departmentId: qr.departmentId,
      distribution: [1, 2, 3, 4, 5].map((s) => ({ score: s, count: scoreMap.get(s) ?? 0 })),
    }
  })
}
