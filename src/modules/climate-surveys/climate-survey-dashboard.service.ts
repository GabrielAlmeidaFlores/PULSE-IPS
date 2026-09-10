import { randomUUID } from "crypto"
import {
  findClimateSurveyDispatchesByTenant,
  findClimateSurveyDispatchWithDashboard,
  findClimateSurveyMultipleDispatchesWithDashboard,
  createClimateSurveyDispatch,
  findClimateSurveyDispatchesByTenantFiltered,
  findClimateSurveyDispatchDaysPaginated,
  findClimateSurveyDispatchesForDates,
  findClimateSurveyDispatchesPaginated,
  findClimateSurveyConfigById,
  findClimateSurveyOpenCommentsByDispatchIds,
  findLatestActiveClimateSurveyDispatch,
  findRecentAvailableClimateSurveyDispatchesForOverview,
  type ClimateSurveyDispatchListingFilters,
  type ClimateSurveyDispatchDashboardData,
  type ClimateSurveyDispatchResponseItem,
} from "@/modules/climate-surveys/climate-survey.repository"
import { findOrganizationById } from "@/modules/organizations/organization.repository"
import {
  CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
  climateSurveyMetricStatus,
  resolveClimateSurveyTopicLabel,
  toClimateSurveyDimension,
  type ClimateSurveyDispatchDashboardStats,
  type ClimateSurveyDimension,
  type ClimateSurveyEnpsBreakdown,
  type ClimateSurveyHeatmapCell,
  type ClimateSurveyModuleDashboard,
  type ClimateSurveyTopic,
  type ClimateSurveyTopicRadarPoint,
  type ClimateSurveyWaveEvolutionPoint,
  type ScoreDirection,
} from "@/modules/climate-surveys/climate-survey.types"
import {
  getClimateSurveyTopicLabelMap,
  listClimateSurveyTopics,
} from "@/modules/climate-surveys/climate-survey-topic.service"
import {
  computeClimateSurveyMetricsBreakdown,
  getClimateSurveyAggregatedMetricsOrEmpty,
  normalizeClimateSurveyLikertScore,
  type ClimateSurveyAggregatedMetrics,
} from "@/modules/climate-surveys/climate-survey-metrics"
import { canRevealClimateSurveyGroupResults, climateSurveyRequiredRespondents } from "@/libs/utils/anonymity"
import { AppError } from "@/libs/errors/app-error"
import {
  emptyClimateSurveyFunnelMetrics,
  getClimateSurveyFunnelMetrics,
} from "@/modules/climate-surveys/climate-survey-analytics.service"

export type { ClimateSurveyDispatchWithConfig } from "@/modules/climate-surveys/climate-survey.repository"

function toScoreDirection(value: string): ScoreDirection {
  return value === "lower_is_better" ? "lower_is_better" : "higher_is_better"
}

function emptyEnpsBreakdown(): ClimateSurveyEnpsBreakdown {
  return {
    promoters: 0,
    neutrals: 0,
    detractors: 0,
    total: 0,
    score: null,
  }
}

function emptyAggregatedMetrics(): ClimateSurveyAggregatedMetrics {
  return {
    answerCount: 0,
    respondentCount: 0,
    favorabilityPercent: null,
    weightedScorePercent: null,
    enps: emptyEnpsBreakdown(),
  }
}

function buildMetricQuestionInputs(
  questions: ClimateSurveyDispatchDashboardData["questions"],
): { id: string; scoreDirection: ScoreDirection; dimension: ClimateSurveyDimension }[] {
  return questions.map((question) => ({
    id: question.id,
    scoreDirection: toScoreDirection(question.scoreDirection),
    dimension: toClimateSurveyDimension(question.dimension),
  }))
}

function buildQuestionStats(
  questions: { id: string; text: string; order: number; scoreDirection: string; dimension: string }[],
  responseItems: { questionId: string; score: number }[],
  metricsByQuestion: Map<string, ClimateSurveyAggregatedMetrics>,
  revealScores: boolean,
): ClimateSurveyDispatchDashboardStats["questions"] {
  return questions.map((q) => {
    const direction = toScoreDirection(q.scoreDirection)
    const dimension = toClimateSurveyDimension(q.dimension)
    const qScores = responseItems
      .filter((i) => i.questionId === q.id)
      .map((i) => normalizeClimateSurveyLikertScore(i.score, direction))
    const avgScore = revealScores && qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : null
    const rawScores = responseItems.filter((i) => i.questionId === q.id).map((i) => i.score)
    const distribution = [1, 2, 3, 4, 5].map((s) => ({
      score: s,
      count: revealScores ? rawScores.filter((v) => v === s).length : 0,
    }))
    const metrics = revealScores
      ? getClimateSurveyAggregatedMetricsOrEmpty(metricsByQuestion.get(q.id))
      : emptyAggregatedMetrics()
    return {
      ...q,
      scoreDirection: direction,
      dimension,
      avgScore,
      favorabilityPercent: metrics.favorabilityPercent,
      weightedScorePercent: metrics.weightedScorePercent,
      enps: metrics.enps.score,
      distribution,
    }
  })
}

function buildDimensionScores(
  questions: ClimateSurveyDispatchDashboardStats["questions"],
  metricsByTopic: Map<ClimateSurveyDimension, ClimateSurveyAggregatedMetrics>,
  revealScores: boolean,
  topicLabelMap: ReadonlyMap<string, string>,
): ClimateSurveyDispatchDashboardStats["dimensionScores"] {
  const byDimension = new Map<ClimateSurveyDimension, { scores: number[]; questionCount: number }>()
  for (const question of questions) {
    const current = byDimension.get(question.dimension) ?? { scores: [], questionCount: 0 }
    current.questionCount += 1
    if (question.avgScore !== null) current.scores.push(question.avgScore)
    byDimension.set(question.dimension, current)
  }
  return Array.from(byDimension.entries()).map(([dimension, data]) => {
    const metrics = revealScores
      ? getClimateSurveyAggregatedMetricsOrEmpty(metricsByTopic.get(dimension))
      : emptyAggregatedMetrics()
    return {
      dimension,
      label: resolveClimateSurveyTopicLabel(dimension, topicLabelMap),
      avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : null,
      favorabilityPercent: metrics.favorabilityPercent,
      weightedScorePercent: metrics.weightedScorePercent,
      enps: metrics.enps.score,
      questionCount: data.questionCount,
    }
  })
}

function buildDepartmentScores(
  departments: { id: string; name: string }[],
  metricsByDepartment: Map<string, ClimateSurveyAggregatedMetrics>,
  revealScores: boolean,
): ClimateSurveyDispatchDashboardStats["departmentScores"] {
  return departments.map((department) => {
    const metrics = revealScores
      ? getClimateSurveyAggregatedMetricsOrEmpty(metricsByDepartment.get(department.id))
      : emptyAggregatedMetrics()
    return {
      departmentId: department.id,
      departmentName: department.name,
      favorabilityPercent: metrics.favorabilityPercent,
      weightedScorePercent: metrics.weightedScorePercent,
      enps: metrics.enps.score,
      answerCount: metrics.answerCount,
      respondentCount: metrics.respondentCount,
    }
  })
}

function buildDispatchStats(
  data: ClimateSurveyDispatchDashboardData,
  minRespondentsPercent: number,
  topicLabelMap: ReadonlyMap<string, string>,
  filterDeptIds?: string[],
): ClimateSurveyDispatchDashboardStats {
  const filteredItems =
    filterDeptIds !== undefined && filterDeptIds.length > 0
      ? data.responseItems.filter((i) => i.departmentId !== null && filterDeptIds.includes(i.departmentId))
      : data.responseItems
  const estimatedResponseCount =
    filterDeptIds !== undefined && filterDeptIds.length > 0
      ? Math.round(filteredItems.length / Math.max(data.questions.length, 1))
      : data.totalResponses
  const scopeRecipients =
    filterDeptIds !== undefined && filterDeptIds.length > 0
      ? data.deptRecipients
          .filter((dr) => filterDeptIds.includes(dr.departmentId))
          .reduce((sum, dr) => sum + dr.totalRecipients, 0)
      : data.totalRecipients
  const requiredRespondents = scopeRecipients > 0
    ? climateSurveyRequiredRespondents(scopeRecipients, minRespondentsPercent)
    : 0
  const hasEnoughRespondents = canRevealClimateSurveyGroupResults(estimatedResponseCount, scopeRecipients, minRespondentsPercent)
  const metricQuestions = buildMetricQuestionInputs(data.questions)
  const metrics = hasEnoughRespondents
    ? computeClimateSurveyMetricsBreakdown(filteredItems, metricQuestions)
    : {
        overall: emptyAggregatedMetrics(),
        byQuestion: new Map<string, ClimateSurveyAggregatedMetrics>(),
        byTopic: new Map<ClimateSurveyDimension, ClimateSurveyAggregatedMetrics>(),
        byDepartment: new Map<string, ClimateSurveyAggregatedMetrics>(),
      }
  const questions = buildQuestionStats(data.questions, filteredItems, metrics.byQuestion, hasEnoughRespondents)
  const allNormalized = hasEnoughRespondents
    ? filteredItems.flatMap((item) => {
        const question = metricQuestions.find((q) => q.id === item.questionId)
        if (question === undefined) return []
        return [normalizeClimateSurveyLikertScore(item.score, question.scoreDirection)]
      })
    : []
  const avgScore = allNormalized.length > 0 ? allNormalized.reduce((a, b) => a + b, 0) / allNormalized.length : null
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
    favorabilityPercent: metrics.overall.favorabilityPercent,
    weightedScorePercent: metrics.overall.weightedScorePercent,
    enps: metrics.overall.enps.score,
    enpsBreakdown: metrics.overall.enps,
    signedLinkToken: data.signedLinkToken,
    minRespondentsPercent,
    requiredRespondents,
    questions,
    dimensionScores: buildDimensionScores(questions, metrics.byTopic, hasEnoughRespondents, topicLabelMap),
    departmentScores: buildDepartmentScores(data.departments, metrics.byDepartment, hasEnoughRespondents),
  }
}

export function getClimateSurveyDispatches(tenantId: string): ReturnType<typeof findClimateSurveyDispatchesByTenant> {
  return findClimateSurveyDispatchesByTenant(tenantId)
}

export function getClimateSurveyOpenComments(
  tenantId: string,
  dispatchIds: string[],
): ReturnType<typeof findClimateSurveyOpenCommentsByDispatchIds> {
  return findClimateSurveyOpenCommentsByDispatchIds(tenantId, dispatchIds)
}

export interface LatestActiveClimateSurveyWave {
  id: string
  configName: string
  scheduledAt: Date
  dispatchedAt: Date | null
  status: string
  totalRecipients: number
  totalResponses: number
  adherenceRate: number
  adherencePercent: number
  departmentNames: string[]
}

export async function getLatestActiveClimateSurveyWave(tenantId: string): Promise<LatestActiveClimateSurveyWave | null> {
  const dispatch = await findLatestActiveClimateSurveyDispatch(tenantId)
  if (!dispatch) return null

  const totalRecipients = dispatch.deptDispatches.reduce((sum, dd) => sum + dd.totalRecipients, 0)
  const totalResponses = dispatch.deptDispatches.reduce((sum, dd) => sum + dd.totalResponses, 0)
  const adherenceRate = totalRecipients > 0 ? totalResponses / totalRecipients : 0

  return {
    id: dispatch.id,
    configName: dispatch.climateSurveyConfiguration.name,
    scheduledAt: dispatch.scheduledAt,
    dispatchedAt: dispatch.dispatchedAt,
    status: dispatch.status,
    totalRecipients,
    totalResponses,
    adherenceRate,
    adherencePercent: Math.round(adherenceRate * 100),
    departmentNames: dispatch.climateSurveyConfiguration.configDepartments.map((cd) => cd.department.name),
  }
}

export interface ClimateSurveyDispatchListingQuery {
  status?: string
  dateFrom?: Date
  dateTo?: Date
  configId?: string
}

export interface ClimateSurveyDispatchDayPageQuery extends ClimateSurveyDispatchListingQuery {
  page: number
  pageSize: number
}

export interface ClimateSurveyDispatchDayPageResult {
  items: import("@/modules/climate-surveys/climate-survey.repository").ClimateSurveyDispatchWithConfig[]
  total: number
}

export function getClimateSurveyDispatchesFiltered(
  tenantId: string,
  query: ClimateSurveyDispatchListingQuery,
): ReturnType<typeof findClimateSurveyDispatchesByTenantFiltered> {
  const filters: ClimateSurveyDispatchListingFilters = {}
  if (query.status !== undefined) filters.status = query.status
  if (query.dateFrom !== undefined) filters.dateFrom = query.dateFrom
  if (query.dateTo !== undefined) filters.dateTo = query.dateTo
  if (query.configId !== undefined) filters.configId = query.configId
  return findClimateSurveyDispatchesByTenantFiltered(tenantId, filters)
}

export async function getClimateSurveyDispatchesPaginatedByDay(
  tenantId: string,
  query: ClimateSurveyDispatchDayPageQuery,
): Promise<ClimateSurveyDispatchDayPageResult> {
  const org = await findOrganizationById(tenantId)
  const timezone = org?.timezone ?? "America/Sao_Paulo"
  const skip = (query.page - 1) * query.pageSize
  const filters: ClimateSurveyDispatchListingFilters = {}
  if (query.status !== undefined) filters.status = query.status
  if (query.dateFrom !== undefined) filters.dateFrom = query.dateFrom
  if (query.dateTo !== undefined) filters.dateTo = query.dateTo
  if (query.configId !== undefined) filters.configId = query.configId
  const { dates, total } = await findClimateSurveyDispatchDaysPaginated(tenantId, filters, skip, query.pageSize, timezone)
  if (dates.length === 0) return { items: [], total }
  const items = await findClimateSurveyDispatchesForDates(tenantId, dates, filters, timezone)
  return { items, total }
}

export function getClimateSurveyDispatchesPaginated(
  tenantId: string,
  query: ClimateSurveyDispatchDayPageQuery,
): Promise<ClimateSurveyDispatchDayPageResult> {
  const skip = (query.page - 1) * query.pageSize
  const filters: ClimateSurveyDispatchListingFilters = {}
  if (query.status !== undefined) filters.status = query.status
  if (query.dateFrom !== undefined) filters.dateFrom = query.dateFrom
  if (query.dateTo !== undefined) filters.dateTo = query.dateTo
  if (query.configId !== undefined) filters.configId = query.configId
  return findClimateSurveyDispatchesPaginated(tenantId, filters, skip, query.pageSize)
}

export async function scheduleClimateSurveyDispatch(
  tenantId: string,
  configId: string,
  scheduledAt: Date,
): Promise<Awaited<ReturnType<typeof createClimateSurveyDispatch>>> {
  const config = await findClimateSurveyConfigById(tenantId, configId)
  if (!config) throw new AppError("CONFIG_NOT_FOUND", "Configuração não encontrada.")
  const token = config.sendViaSignedLink ? randomUUID() : undefined
  return createClimateSurveyDispatch(tenantId, configId, scheduledAt, "manual", token)
}

export async function getClimateSurveyDispatchDashboard(
  tenantId: string,
  dispatchId: string,
  filterDeptIds?: string[],
): Promise<ClimateSurveyDispatchDashboardStats | null> {
  const [data, org, topicLabelMap] = await Promise.all([
    findClimateSurveyDispatchWithDashboard(tenantId, dispatchId),
    findOrganizationById(tenantId),
    getClimateSurveyTopicLabelMap(tenantId),
  ])
  if (!data) return null
  return buildDispatchStats(data, org?.climateSurveyMinRespondentsPercent ?? 40, topicLabelMap, filterDeptIds)
}

export async function getClimateSurveyMultipleDispatchDashboards(
  tenantId: string,
  dispatchIds: string[],
  filterDeptIds?: string[],
): Promise<ClimateSurveyDispatchDashboardStats[]> {
  const [dataList, org, topicLabelMap] = await Promise.all([
    findClimateSurveyMultipleDispatchesWithDashboard(tenantId, dispatchIds),
    findOrganizationById(tenantId),
    getClimateSurveyTopicLabelMap(tenantId),
  ])
  const minRespondentsPercent = org?.climateSurveyMinRespondentsPercent ?? 40
  return dataList.map((data) => buildDispatchStats(data, minRespondentsPercent, topicLabelMap, filterDeptIds))
}

function resolveWaveTopicKeys(
  topics: ClimateSurveyTopic[],
  questions: { dimension: string }[],
): ClimateSurveyDimension[] {
  const usedKeys = new Set<ClimateSurveyDimension>()
  for (const question of questions) {
    usedKeys.add(toClimateSurveyDimension(question.dimension))
  }
  const orderedKeys: ClimateSurveyDimension[] = topics
    .filter((topic) => usedKeys.has(topic.key))
    .map((topic) => topic.key)
  for (const key of usedKeys) {
    if (!orderedKeys.includes(key)) orderedKeys.push(key)
  }
  return orderedKeys
}

function buildRadarPoints(
  topicMetrics: Map<ClimateSurveyDimension, ClimateSurveyAggregatedMetrics>,
  orderedTopicKeys: ClimateSurveyDimension[],
  topicLabelMap: ReadonlyMap<string, string>,
): ClimateSurveyTopicRadarPoint[] {
  return orderedTopicKeys.map((dimension) => {
    const metrics = getClimateSurveyAggregatedMetricsOrEmpty(topicMetrics.get(dimension))
    const scorePercent = metrics.weightedScorePercent
    return {
      dimension,
      label: resolveClimateSurveyTopicLabel(dimension, topicLabelMap),
      scorePercent,
      goalPercent: CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
      status: climateSurveyMetricStatus(scorePercent),
    }
  })
}

function buildHeatmap(
  items: ClimateSurveyDispatchResponseItem[],
  questions: ClimateSurveyDispatchDashboardData["questions"],
  departments: { id: string; name: string }[],
  deptRecipients: { departmentId: string; totalRecipients: number }[],
  hasEnoughRespondents: boolean,
  minRespondentsPercent: number,
  orderedTopicKeys: ClimateSurveyDimension[],
  topicLabelMap: ReadonlyMap<string, string>,
): ClimateSurveyModuleDashboard["heatmap"] {
  const metricQuestions = buildMetricQuestionInputs(questions)
  const deptRecipientsMap = new Map(deptRecipients.map((dr) => [dr.departmentId, dr.totalRecipients]))
  const cells: ClimateSurveyHeatmapCell[] = []

  for (const dimension of orderedTopicKeys) {
    for (const department of departments) {
      const deptTopicItems = items.filter((item) => {
        if (item.departmentId !== department.id) return false
        const question = metricQuestions.find((q) => q.id === item.questionId)
        return question?.dimension === dimension
      })
      const topicQuestionCount = Math.max(
        questions.filter((q) => toClimateSurveyDimension(q.dimension) === dimension).length,
        1,
      )
      const estimatedRespondents = Math.round(deptTopicItems.length / topicQuestionCount)
      const scopeRecipients = deptRecipientsMap.get(department.id) ?? 0
      const canShow =
        hasEnoughRespondents &&
        canRevealClimateSurveyGroupResults(estimatedRespondents, scopeRecipients, minRespondentsPercent) &&
        deptTopicItems.length > 0
      const metrics = canShow
        ? computeClimateSurveyMetricsBreakdown(deptTopicItems, metricQuestions).byTopic.get(dimension)
        : undefined
      const scorePercent = canShow ? (metrics?.weightedScorePercent ?? null) : null
      cells.push({
        dimension,
        departmentId: department.id,
        scorePercent,
        status: climateSurveyMetricStatus(scorePercent),
        responseCount: canShow ? estimatedRespondents : null,
      })
    }
  }

  return {
    topics: orderedTopicKeys.map((dimension) => ({
      dimension,
      label: resolveClimateSurveyTopicLabel(dimension, topicLabelMap),
    })),
    departments,
    cells,
  }
}

function buildWaveEvolutionPoint(
  data: ClimateSurveyDispatchDashboardData,
  minRespondentsPercent: number,
): ClimateSurveyWaveEvolutionPoint {
  const hasEnough = canRevealClimateSurveyGroupResults(data.totalResponses, data.totalRecipients, minRespondentsPercent)
  const metrics = hasEnough
    ? computeClimateSurveyMetricsBreakdown(data.responseItems, buildMetricQuestionInputs(data.questions)).overall
    : emptyAggregatedMetrics()
  const adherencePercent =
    data.totalRecipients > 0 ? Math.round((data.totalResponses / data.totalRecipients) * 100) : 0
  const when = data.dispatchedAt ?? data.scheduledAt

  return {
    dispatchId: data.id,
    label: when.toISOString().slice(0, 10),
    scheduledAt: data.scheduledAt,
    adherencePercent,
    favorabilityPercent: metrics.favorabilityPercent,
    enps: metrics.enps.score,
    overallScorePercent: metrics.weightedScorePercent,
  }
}

function resolveEnpsStatus(score: number | null): ClimateSurveyModuleDashboard["kpis"]["enpsStatus"] {
  if (score === null) return "unavailable"
  if (score >= 30) return "above_goal"
  if (score >= 0) return "attention"
  return "critical"
}

export async function getClimateSurveyModuleDashboard(tenantId: string): Promise<ClimateSurveyModuleDashboard> {
  const [org, waves, topics] = await Promise.all([
    findOrganizationById(tenantId),
    findRecentAvailableClimateSurveyDispatchesForOverview(tenantId, 8),
    listClimateSurveyTopics(tenantId),
  ])
  const minRespondentsPercent = org?.climateSurveyMinRespondentsPercent ?? 40
  const latest = waves[0] ?? null
  const emptyEnps = emptyEnpsBreakdown()
  const topicLabelMap = new Map(topics.map((topic) => [topic.key, topic.label]))
  const allTopicKeys = topics.map((topic) => topic.key)

  if (latest === null) {
    return {
      wave: null,
      kpis: {
        adherencePercent: null,
        totalResponses: 0,
        totalRecipients: 0,
        favorabilityPercent: null,
        enps: null,
        adherenceStatus: "unavailable",
        favorabilityStatus: "unavailable",
        enpsStatus: "unavailable",
      },
      corporateGoalPercent: CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
      minRespondentsPercent,
      requiredRespondents: 0,
      radar: buildRadarPoints(new Map(), allTopicKeys, topicLabelMap),
      evolution: [],
      enpsBreakdown: emptyEnps,
      heatmap: {
        topics: allTopicKeys.map((dimension) => ({
          dimension,
          label: resolveClimateSurveyTopicLabel(dimension, topicLabelMap),
        })),
        departments: [],
        cells: [],
      },
      hasEnoughRespondents: false,
      funnel: emptyClimateSurveyFunnelMetrics(),
    }
  }

  const hasEnoughRespondents = canRevealClimateSurveyGroupResults(
    latest.totalResponses,
    latest.totalRecipients,
    minRespondentsPercent,
  )
  const requiredRespondents = latest.totalRecipients > 0
    ? climateSurveyRequiredRespondents(latest.totalRecipients, minRespondentsPercent)
    : 0
  const adherencePercent =
    latest.totalRecipients > 0 ? Math.round((latest.totalResponses / latest.totalRecipients) * 100) : 0
  const metrics = hasEnoughRespondents
    ? computeClimateSurveyMetricsBreakdown(latest.responseItems, buildMetricQuestionInputs(latest.questions))
    : {
        overall: emptyAggregatedMetrics(),
        byQuestion: new Map<string, ClimateSurveyAggregatedMetrics>(),
        byTopic: new Map<ClimateSurveyDimension, ClimateSurveyAggregatedMetrics>(),
        byDepartment: new Map<string, ClimateSurveyAggregatedMetrics>(),
      }
  const evolution = [...waves].reverse().map((wave) => buildWaveEvolutionPoint(wave, minRespondentsPercent))
  const funnel = await getClimateSurveyFunnelMetrics(tenantId, latest.id)
  const orderedTopicKeys = resolveWaveTopicKeys(topics, latest.questions)

  return {
    wave: {
      id: latest.id,
      configName: latest.configName,
      scheduledAt: latest.scheduledAt,
      dispatchedAt: latest.dispatchedAt,
      status: latest.status,
      departmentNames: latest.departments.map((d) => d.name),
    },
    kpis: {
      adherencePercent,
      totalResponses: latest.totalResponses,
      totalRecipients: latest.totalRecipients,
      favorabilityPercent: metrics.overall.favorabilityPercent,
      enps: metrics.overall.enps.score,
      adherenceStatus: climateSurveyMetricStatus(adherencePercent, 80),
      favorabilityStatus: climateSurveyMetricStatus(metrics.overall.favorabilityPercent),
      enpsStatus: resolveEnpsStatus(metrics.overall.enps.score),
    },
    corporateGoalPercent: CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
    minRespondentsPercent,
    requiredRespondents,
    radar: buildRadarPoints(metrics.byTopic, orderedTopicKeys, topicLabelMap),
    evolution,
    enpsBreakdown: metrics.overall.enps,
    heatmap: buildHeatmap(
      latest.responseItems,
      latest.questions,
      latest.departments,
      latest.deptRecipients,
      hasEnoughRespondents,
      minRespondentsPercent,
      orderedTopicKeys,
      topicLabelMap,
    ),
    hasEnoughRespondents,
    funnel,
  }
}
