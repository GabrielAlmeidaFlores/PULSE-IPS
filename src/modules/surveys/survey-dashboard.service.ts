import {
  findDispatchesByTenant,
  findDispatchWithDashboard,
  findMultipleDispatchesWithDashboard,
  createDispatch,
} from "@/modules/surveys/survey.repository"
import type { DispatchDashboardStats, ScoreDirection } from "@/modules/surveys/survey.types"

export type { DispatchWithConfig } from "@/modules/surveys/survey.repository"

function normalizeScore(raw: number, direction: string): number {
  return direction === "lower_is_better" ? 6 - raw : raw
}

function toScoreDirection(value: string): ScoreDirection {
  return value === "lower_is_better" ? "lower_is_better" : "higher_is_better"
}

function buildQuestionStats(
  questions: { id: string; text: string; order: number; scoreDirection: string }[],
  responseItems: { questionId: string; score: number }[],
): { id: string; text: string; order: number; scoreDirection: ScoreDirection; avgScore: number | null; distribution: { score: number; count: number }[] }[] {
  return questions.map((q) => {
    const direction = toScoreDirection(q.scoreDirection)
    const qScores = responseItems.filter((i) => i.questionId === q.id).map((i) => normalizeScore(i.score, direction))
    const avgScore = qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : null
    const rawScores = responseItems.filter((i) => i.questionId === q.id).map((i) => i.score)
    const distribution = [1, 2, 3, 4, 5].map((s) => ({
      score: s,
      count: rawScores.filter((v) => v === s).length,
    }))
    return { ...q, scoreDirection: direction, avgScore, distribution }
  })
}

function calcOverallAvgScore(
  questions: { id: string; scoreDirection: ScoreDirection }[],
  responseItems: { questionId: string; score: number }[],
): number | null {
  const allNormalized = questions.flatMap((q) =>
    responseItems.filter((i) => i.questionId === q.id).map((i) => normalizeScore(i.score, q.scoreDirection)),
  )
  return allNormalized.length > 0 ? allNormalized.reduce((a, b) => a + b, 0) / allNormalized.length : null
}

function buildDispatchStats(data: {
  id: string
  departmentId: string
  status: string
  scheduledAt: Date
  dispatchedAt: Date | null
  departmentName: string
  frequency: string
  totalRecipients: number
  totalResponses: number
  questions: { id: string; text: string; order: number; scoreDirection: string }[]
  responseItems: { questionId: string; score: number }[]
}): DispatchDashboardStats {
  const questions = buildQuestionStats(data.questions, data.responseItems)
  const avgScore = calcOverallAvgScore(questions, data.responseItems)
  const notResponded = Math.max(0, data.totalRecipients - data.totalResponses)
  const adherenceRate = data.totalRecipients > 0 ? data.totalResponses / data.totalRecipients : 0

  return {
    id: data.id,
    departmentId: data.departmentId,
    status: data.status,
    scheduledAt: data.scheduledAt,
    dispatchedAt: data.dispatchedAt,
    departmentName: data.departmentName,
    frequency: data.frequency,
    totalRecipients: data.totalRecipients,
    totalResponses: data.totalResponses,
    notResponded,
    adherenceRate,
    avgScore,
    questions,
  }
}

export function getDispatches(tenantId: string): ReturnType<typeof findDispatchesByTenant> {
  return findDispatchesByTenant(tenantId)
}

export function scheduleDispatch(tenantId: string, configId: string, scheduledAt: Date): ReturnType<typeof createDispatch> {
  return createDispatch(tenantId, configId, scheduledAt)
}

export async function getDispatchDashboard(tenantId: string, dispatchId: string): Promise<DispatchDashboardStats | null> {
  const data = await findDispatchWithDashboard(tenantId, dispatchId)
  if (!data) return null
  return buildDispatchStats(data)
}

export async function getMultipleDispatchDashboards(
  tenantId: string,
  dispatchIds: string[],
): Promise<DispatchDashboardStats[]> {
  const dataList = await findMultipleDispatchesWithDashboard(tenantId, dispatchIds)
  return dataList.map((data) => buildDispatchStats(data))
}
