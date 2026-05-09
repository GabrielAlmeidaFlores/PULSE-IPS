import { randomUUID } from "crypto"
import {
  findHealthSurveyDispatchesByTenant,
  findHealthSurveyDispatchWithDashboard,
  findHealthSurveyMultipleDispatchesWithDashboard,
  createHealthSurveyDispatch,
  findHealthSurveyDispatchesByTenantFiltered,
  findHealthSurveyDispatchDaysPaginated,
  findHealthSurveyDispatchesForDates,
  findHealthSurveyDispatchesPaginated,
  type HealthSurveyDispatchListingFilters,
  type HealthSurveyDispatchDashboardData,
} from "@/modules/health-surveys/health-survey.repository"
import { findOrganizationById } from "@/modules/organizations/organization.repository"
import type { HealthSurveyDispatchDashboardStats, ScoreDirection } from "@/modules/health-surveys/health-survey.types"
import { MINIMUM_RESPONDENTS_FOR_DISPLAY } from "@/libs/utils/anonymity"

export type { HealthSurveyDispatchWithConfig } from "@/modules/health-surveys/health-survey.repository"

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

function buildDispatchStats(data: HealthSurveyDispatchDashboardData): HealthSurveyDispatchDashboardStats {
  const hasEnoughRespondents = data.totalResponses >= MINIMUM_RESPONDENTS_FOR_DISPLAY
  const questions = hasEnoughRespondents
    ? buildQuestionStats(data.questions, data.responseItems)
    : buildQuestionStats(data.questions, [])
  const avgScore = hasEnoughRespondents ? calcOverallAvgScore(questions, data.responseItems) : null
  const notResponded = Math.max(0, data.totalRecipients - data.totalResponses)
  const adherenceRate = data.totalRecipients > 0 ? data.totalResponses / data.totalRecipients : 0

  return {
    id: data.id,
    status: data.status,
    scheduledAt: data.scheduledAt,
    dispatchedAt: data.dispatchedAt,
    configName: data.configName,
    frequency: data.frequency,
    departments: data.departments,
    totalRecipients: data.totalRecipients,
    totalResponses: data.totalResponses,
    notResponded,
    adherenceRate,
    avgScore,
    signedLinkToken: data.signedLinkToken,
    questions,
  }
}

export function getHealthSurveyDispatches(tenantId: string): ReturnType<typeof findHealthSurveyDispatchesByTenant> {
  return findHealthSurveyDispatchesByTenant(tenantId)
}

export interface HealthSurveyDispatchListingQuery {
  status?: string
  dateFrom?: Date
  dateTo?: Date
  configId?: string
}

export interface HealthSurveyDispatchDayPageQuery extends HealthSurveyDispatchListingQuery {
  page: number
  pageSize: number
}

export interface HealthSurveyDispatchDayPageResult {
  items: import("@/modules/health-surveys/health-survey.repository").HealthSurveyDispatchWithConfig[]
  total: number
}

export function getHealthSurveyDispatchesFiltered(
  tenantId: string,
  query: HealthSurveyDispatchListingQuery,
): ReturnType<typeof findHealthSurveyDispatchesByTenantFiltered> {
  const filters: HealthSurveyDispatchListingFilters = {}
  if (query.status !== undefined) filters.status = query.status
  if (query.dateFrom !== undefined) filters.dateFrom = query.dateFrom
  if (query.dateTo !== undefined) filters.dateTo = query.dateTo
  if (query.configId !== undefined) filters.configId = query.configId
  return findHealthSurveyDispatchesByTenantFiltered(tenantId, filters)
}

export async function getHealthSurveyDispatchesPaginatedByDay(
  tenantId: string,
  query: HealthSurveyDispatchDayPageQuery,
): Promise<HealthSurveyDispatchDayPageResult> {
  const org = await findOrganizationById(tenantId)
  const timezone = org?.timezone ?? "America/Sao_Paulo"
  const skip = (query.page - 1) * query.pageSize
  const filters: HealthSurveyDispatchListingFilters = {}
  if (query.status !== undefined) filters.status = query.status
  if (query.dateFrom !== undefined) filters.dateFrom = query.dateFrom
  if (query.dateTo !== undefined) filters.dateTo = query.dateTo
  if (query.configId !== undefined) filters.configId = query.configId
  const { dates, total } = await findHealthSurveyDispatchDaysPaginated(tenantId, filters, skip, query.pageSize, timezone)
  if (dates.length === 0) return { items: [], total }
  const items = await findHealthSurveyDispatchesForDates(tenantId, dates, filters, timezone)
  return { items, total }
}

export function getHealthSurveyDispatchesPaginated(
  tenantId: string,
  query: HealthSurveyDispatchDayPageQuery,
): Promise<HealthSurveyDispatchDayPageResult> {
  const skip = (query.page - 1) * query.pageSize
  const filters: HealthSurveyDispatchListingFilters = {}
  if (query.status !== undefined) filters.status = query.status
  if (query.dateFrom !== undefined) filters.dateFrom = query.dateFrom
  if (query.dateTo !== undefined) filters.dateTo = query.dateTo
  if (query.configId !== undefined) filters.configId = query.configId
  return findHealthSurveyDispatchesPaginated(tenantId, filters, skip, query.pageSize)
}

export function scheduleHealthSurveyDispatch(
  tenantId: string,
  configId: string,
  scheduledAt: Date,
): ReturnType<typeof createHealthSurveyDispatch> {
  const token = randomUUID()
  return createHealthSurveyDispatch(tenantId, configId, scheduledAt, token)
}

export async function getHealthSurveyDispatchDashboard(
  tenantId: string,
  dispatchId: string,
): Promise<HealthSurveyDispatchDashboardStats | null> {
  const data = await findHealthSurveyDispatchWithDashboard(tenantId, dispatchId)
  if (!data) return null
  return buildDispatchStats(data)
}

export async function getHealthSurveyMultipleDispatchDashboards(
  tenantId: string,
  dispatchIds: string[],
): Promise<HealthSurveyDispatchDashboardStats[]> {
  const dataList = await findHealthSurveyMultipleDispatchesWithDashboard(tenantId, dispatchIds)
  return dataList.map((data) => buildDispatchStats(data))
}
