import {
  countClimateSurveyActionPlansByDispatch,
  type ClimateSurveyActionPlanStatusCounts,
} from "@/modules/action-plans/action-plan.repository"
import { getClimateSurveyMultipleDispatchDashboards } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { findClimateSurveyWaveOptions } from "@/modules/climate-surveys/climate-survey.repository"
import {
  CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
  resolveClimateSurveyReadingPill,
  type ClimateSurveyDimension,
  type ClimateSurveyDispatchDashboardStats,
  type ClimateSurveyReadingPill,
} from "@/modules/climate-surveys/climate-survey.types"

export const CLIMATE_SURVEY_COMPARISON_MIN_RESPONDENTS = 5

export interface ClimateSurveyWaveOption {
  id: string
  configName: string
  scheduledAt: Date
  dispatchedAt: Date | null
}

export interface ClimateSurveyMetricComparison {
  key: "favorability" | "enps" | "adherence" | "topics_below_goal"
  label: string
  unit: "percent" | "points" | "count"
  higherIsBetter: boolean
  baseValue: number | null
  compareValue: number | null
  delta: number | null
}

export interface ClimateSurveyTopicComparison {
  dimension: ClimateSurveyDimension
  label: string
  baseValue: number | null
  compareValue: number | null
  delta: number | null
  reading: ClimateSurveyReadingPill | null
  crossedGoal: boolean
}

export interface ClimateSurveyDepartmentComparison {
  departmentId: string
  label: string
  baseValue: number | null
  compareValue: number | null
  delta: number | null
  reading: ClimateSurveyReadingPill | null
  excluded: boolean
}

export interface ClimateSurveyComparisonHighlight {
  kind: "topic" | "department"
  label: string
  delta: number
}

export interface ClimateSurveyWaveComparison {
  base: ClimateSurveyWaveOption
  compare: ClimateSurveyWaveOption
  metrics: ClimateSurveyMetricComparison[]
  topics: ClimateSurveyTopicComparison[]
  departments: ClimateSurveyDepartmentComparison[]
  topIncreases: ClimateSurveyComparisonHighlight[]
  topDrops: ClimateSurveyComparisonHighlight[]
  actionPlans: ClimateSurveyActionPlanStatusCounts
}

export interface ClimateSurveyWaveComparisonData {
  options: ClimateSurveyWaveOption[]
  baseId: string | null
  compareId: string | null
  comparison: ClimateSurveyWaveComparison | null
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function computeDelta(base: number | null, compare: number | null): number | null {
  if (base === null || compare === null) return null
  return roundOneDecimal(compare - base)
}

function toWaveOption(stats: ClimateSurveyDispatchDashboardStats): ClimateSurveyWaveOption {
  return {
    id: stats.id,
    configName: stats.configName,
    scheduledAt: stats.scheduledAt,
    dispatchedAt: stats.dispatchedAt,
  }
}

function buildMetric(
  key: ClimateSurveyMetricComparison["key"],
  label: string,
  unit: ClimateSurveyMetricComparison["unit"],
  higherIsBetter: boolean,
  baseValue: number | null,
  compareValue: number | null,
): ClimateSurveyMetricComparison {
  return { key, label, unit, higherIsBetter, baseValue, compareValue, delta: computeDelta(baseValue, compareValue) }
}

function countTopicsBelowGoal(dashboard: ClimateSurveyDispatchDashboardStats): number {
  return dashboard.dimensionScores.filter(
    (topic) => topic.favorabilityPercent !== null && topic.favorabilityPercent < CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
  ).length
}

function crossedGoal(baseValue: number | null, compareValue: number | null): boolean {
  if (baseValue === null || compareValue === null) return false
  const baseBelowGoal = baseValue < CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT
  const compareBelowGoal = compareValue < CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT
  return baseBelowGoal !== compareBelowGoal
}

function buildTopics(base: ClimateSurveyDispatchDashboardStats, compare: ClimateSurveyDispatchDashboardStats): ClimateSurveyTopicComparison[] {
  const compareByDimension = new Map(compare.dimensionScores.map((topic) => [topic.dimension, topic]))
  return base.dimensionScores.map((baseTopic) => {
    const compareTopic = compareByDimension.get(baseTopic.dimension)
    const baseValue = baseTopic.favorabilityPercent
    const compareValue = compareTopic?.favorabilityPercent ?? null
    const delta = computeDelta(baseValue, compareValue)
    return {
      dimension: baseTopic.dimension,
      label: baseTopic.label,
      baseValue,
      compareValue,
      delta,
      reading: compareValue === null || delta === null ? null : resolveClimateSurveyReadingPill(compareValue, delta),
      crossedGoal: crossedGoal(baseValue, compareValue),
    }
  })
}

function buildDepartments(
  base: ClimateSurveyDispatchDashboardStats,
  compare: ClimateSurveyDispatchDashboardStats,
): ClimateSurveyDepartmentComparison[] {
  const baseById = new Map(base.departmentScores.map((department) => [department.departmentId, department]))
  const compareById = new Map(compare.departmentScores.map((department) => [department.departmentId, department]))
  const departmentIds = new Set([...baseById.keys(), ...compareById.keys()])

  return Array.from(departmentIds).map((departmentId) => {
    const baseDepartment = baseById.get(departmentId)
    const compareDepartment = compareById.get(departmentId)
    const label = baseDepartment?.departmentName ?? compareDepartment?.departmentName ?? "—"
    const baseRespondents = baseDepartment?.respondentCount ?? 0
    const compareRespondents = compareDepartment?.respondentCount ?? 0
    const excluded =
      baseRespondents < CLIMATE_SURVEY_COMPARISON_MIN_RESPONDENTS ||
      compareRespondents < CLIMATE_SURVEY_COMPARISON_MIN_RESPONDENTS
    if (excluded) {
      return { departmentId, label, baseValue: null, compareValue: null, delta: null, reading: null, excluded: true }
    }
    const baseValue = baseDepartment?.favorabilityPercent ?? null
    const compareValue = compareDepartment?.favorabilityPercent ?? null
    const delta = computeDelta(baseValue, compareValue)
    return {
      departmentId,
      label,
      baseValue,
      compareValue,
      delta,
      reading: compareValue === null || delta === null ? null : resolveClimateSurveyReadingPill(compareValue, delta),
      excluded: false,
    }
  })
}

function buildHighlights(
  topics: ClimateSurveyTopicComparison[],
  departments: ClimateSurveyDepartmentComparison[],
): { topIncreases: ClimateSurveyComparisonHighlight[]; topDrops: ClimateSurveyComparisonHighlight[] } {
  const highlights: ClimateSurveyComparisonHighlight[] = []
  for (const topic of topics) {
    if (topic.delta !== null) highlights.push({ kind: "topic", label: topic.label, delta: topic.delta })
  }
  for (const department of departments) {
    if (!department.excluded && department.delta !== null) {
      highlights.push({ kind: "department", label: department.label, delta: department.delta })
    }
  }
  const topIncreases = highlights
    .filter((highlight) => highlight.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
  const topDrops = highlights
    .filter((highlight) => highlight.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3)
  return { topIncreases, topDrops }
}

export function listClimateSurveyWaveOptions(tenantId: string): Promise<ClimateSurveyWaveOption[]> {
  return findClimateSurveyWaveOptions(tenantId)
}

export async function getClimateSurveyWaveComparison(
  tenantId: string,
  baseId?: string,
  compareId?: string,
): Promise<ClimateSurveyWaveComparisonData> {
  const options = await listClimateSurveyWaveOptions(tenantId)
  const resolvedBaseId =
    baseId !== undefined && options.some((option) => option.id === baseId) ? baseId : options[1]?.id
  const resolvedCompareId =
    compareId !== undefined && options.some((option) => option.id === compareId) ? compareId : options[0]?.id

  if (
    resolvedBaseId === undefined ||
    resolvedCompareId === undefined ||
    resolvedBaseId === resolvedCompareId
  ) {
    return { options, baseId: resolvedBaseId ?? null, compareId: resolvedCompareId ?? null, comparison: null }
  }

  const dashboards = await getClimateSurveyMultipleDispatchDashboards(tenantId, [resolvedBaseId, resolvedCompareId])
  const base = dashboards.find((dashboard) => dashboard.id === resolvedBaseId)
  const compare = dashboards.find((dashboard) => dashboard.id === resolvedCompareId)
  if (base === undefined || compare === undefined) {
    return { options, baseId: resolvedBaseId, compareId: resolvedCompareId, comparison: null }
  }

  const metrics: ClimateSurveyMetricComparison[] = [
    buildMetric("favorability", "Favorabilidade", "percent", true, base.favorabilityPercent, compare.favorabilityPercent),
    buildMetric("enps", "eNPS", "points", true, base.enps, compare.enps),
    buildMetric(
      "adherence",
      "Adesão",
      "percent",
      true,
      roundOneDecimal(base.adherenceRate * 100),
      roundOneDecimal(compare.adherenceRate * 100),
    ),
    buildMetric(
      "topics_below_goal",
      "Tópicos abaixo da meta",
      "count",
      false,
      countTopicsBelowGoal(base),
      countTopicsBelowGoal(compare),
    ),
  ]

  const topics = buildTopics(base, compare)
  const departments = buildDepartments(base, compare)
  const { topIncreases, topDrops } = buildHighlights(topics, departments)
  const actionPlans = await countClimateSurveyActionPlansByDispatch(tenantId, resolvedBaseId)

  return {
    options,
    baseId: resolvedBaseId,
    compareId: resolvedCompareId,
    comparison: { base: toWaveOption(base), compare: toWaveOption(compare), metrics, topics, departments, topIncreases, topDrops, actionPlans },
  }
}
