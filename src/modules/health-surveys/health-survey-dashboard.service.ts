import {
  findDispatchesByTenant,
  findDispatchWithDashboard,
  findMultipleDispatchesWithDashboard,
  createDispatch,
  findDispatchesByTenantFiltered,
  findDispatchDaysPaginated,
  findDispatchesForDates,
  type HealthSurveyDispatchListingFilters,
} from "@/modules/health-surveys/health-survey.repository"
import type { DispatchDashboardStats, ScoreDirection } from "@/modules/health-surveys/health-survey.types"
import { MINIMUM_RESPONDENTS_FOR_DISPLAY } from "@/libs/utils/anonymity"

export type { DispatchWithConfig } from "@/modules/health-surveys/health-survey.repository"

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
  const hasEnoughRespondents = data.totalResponses >= MINIMUM_RESPONDENTS_FOR_DISPLAY
  const questions = hasEnoughRespondents ? buildQuestionStats(data.questions, data.responseItems) : buildQuestionStats(data.questions, [])
  const avgScore = hasEnoughRespondents ? calcOverallAvgScore(questions, data.responseItems) : null
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

export interface SurveyDispatchListingQuery {
  status?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface SurveyDispatchDayPageQuery extends SurveyDispatchListingQuery {
  page: number
  pageSize: number
}

export interface SurveyDispatchDayPageResult {
  items: import("@/modules/health-surveys/health-survey.repository").DispatchWithConfig[]
  total: number
}

export function getDispatchesFiltered(
  tenantId: string,
  query: SurveyDispatchListingQuery,
): ReturnType<typeof findDispatchesByTenantFiltered> {
  const filters: HealthSurveyDispatchListingFilters = {}
  if (query.status !== undefined) filters.status = query.status
  if (query.dateFrom !== undefined) filters.dateFrom = query.dateFrom
  if (query.dateTo !== undefined) filters.dateTo = query.dateTo
  return findDispatchesByTenantFiltered(tenantId, filters)
}

export async function getDispatchesPaginatedByDay(
  tenantId: string,
  query: SurveyDispatchDayPageQuery,
): Promise<SurveyDispatchDayPageResult> {
  const skip = (query.page - 1) * query.pageSize
  const filters: HealthSurveyDispatchListingFilters = {}
  if (query.status !== undefined) filters.status = query.status
  if (query.dateFrom !== undefined) filters.dateFrom = query.dateFrom
  if (query.dateTo !== undefined) filters.dateTo = query.dateTo
  const { dates, total } = await findDispatchDaysPaginated(tenantId, filters, skip, query.pageSize)
  if (dates.length === 0) return { items: [], total }
  const items = await findDispatchesForDates(tenantId, dates, filters)
  return { items, total }
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
