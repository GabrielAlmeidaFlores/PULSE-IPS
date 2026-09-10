import {
  countClimateSurveyActionPlansByDispatch,
  type ClimateSurveyActionPlanStatusCounts,
} from "@/modules/action-plans/action-plan.repository"
import { getClimateSurveyMultipleDispatchDashboards } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { findClimateSurveyWaveOptions } from "@/modules/climate-surveys/climate-survey.repository"
import type {
  ClimateSurveyDimension,
  ClimateSurveyDispatchDashboardStats,
} from "@/modules/climate-surveys/climate-survey.types"

export interface ClimateSurveyWaveOption {
  id: string
  configName: string
  scheduledAt: Date
  dispatchedAt: Date | null
}

export interface ClimateSurveyMetricComparison {
  key: "adherence" | "favorability" | "score" | "enps"
  label: string
  unit: "percent" | "points"
  baseValue: number | null
  compareValue: number | null
  delta: number | null
}

export interface ClimateSurveyTopicComparison {
  dimension: ClimateSurveyDimension
  label: string
  baseScorePercent: number | null
  compareScorePercent: number | null
  delta: number | null
}

export interface ClimateSurveyWaveComparison {
  base: ClimateSurveyWaveOption
  compare: ClimateSurveyWaveOption
  metrics: ClimateSurveyMetricComparison[]
  topics: ClimateSurveyTopicComparison[]
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
  baseValue: number | null,
  compareValue: number | null,
): ClimateSurveyMetricComparison {
  return { key, label, unit, baseValue, compareValue, delta: computeDelta(baseValue, compareValue) }
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
    buildMetric("adherence", "Adesão", "percent", roundOneDecimal(base.adherenceRate * 100), roundOneDecimal(compare.adherenceRate * 100)),
    buildMetric("favorability", "Favorabilidade", "percent", base.favorabilityPercent, compare.favorabilityPercent),
    buildMetric("score", "Score de clima", "percent", base.weightedScorePercent, compare.weightedScorePercent),
    buildMetric("enps", "eNPS", "points", base.enps, compare.enps),
  ]

  const compareByDimension = new Map(compare.dimensionScores.map((topic) => [topic.dimension, topic]))
  const topics: ClimateSurveyTopicComparison[] = base.dimensionScores.map((baseTopic) => {
    const compareTopic = compareByDimension.get(baseTopic.dimension)
    return {
      dimension: baseTopic.dimension,
      label: baseTopic.label,
      baseScorePercent: baseTopic.weightedScorePercent,
      compareScorePercent: compareTopic?.weightedScorePercent ?? null,
      delta: computeDelta(baseTopic.weightedScorePercent, compareTopic?.weightedScorePercent ?? null),
    }
  })

  const actionPlans = await countClimateSurveyActionPlansByDispatch(tenantId, resolvedBaseId)

  return {
    options,
    baseId: resolvedBaseId,
    compareId: resolvedCompareId,
    comparison: { base: toWaveOption(base), compare: toWaveOption(compare), metrics, topics, actionPlans },
  }
}
