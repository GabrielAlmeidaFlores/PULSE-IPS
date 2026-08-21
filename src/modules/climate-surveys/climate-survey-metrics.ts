import {
  CLIMATE_SURVEY_DIMENSION_ORDER,
  type ClimateSurveyDimension,
  type ClimateSurveyEnpsBreakdown,
  type ScoreDirection,
} from "@/modules/climate-surveys/climate-survey.types"

export const CLIMATE_SURVEY_LIKERT_WEIGHT_BY_SCORE: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0.2,
  2: 0.4,
  3: 0.6,
  4: 0.8,
  5: 1.0,
}

export interface ClimateSurveyMetricAnswerInput {
  questionId: string
  responseId: string
  departmentId: string | null
  score: number
}

export interface ClimateSurveyMetricQuestionInput {
  id: string
  scoreDirection: ScoreDirection
  dimension: ClimateSurveyDimension
}

export interface ClimateSurveyAggregatedMetrics {
  answerCount: number
  respondentCount: number
  favorabilityPercent: number | null
  weightedScorePercent: number | null
  enps: ClimateSurveyEnpsBreakdown
}

export interface ClimateSurveyMetricsBreakdown {
  overall: ClimateSurveyAggregatedMetrics
  byQuestion: Map<string, ClimateSurveyAggregatedMetrics>
  byTopic: Map<ClimateSurveyDimension, ClimateSurveyAggregatedMetrics>
  byDepartment: Map<string, ClimateSurveyAggregatedMetrics>
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

export function normalizeClimateSurveyLikertScore(raw: number, direction: ScoreDirection): number {
  const flipped = direction === "lower_is_better" ? 6 - raw : raw
  if (flipped < 1) return 1
  if (flipped > 5) return 5
  return flipped
}

export function climateSurveyLikertWeight(normalizedScore: number): number {
  const rounded = Math.round(normalizedScore) as 1 | 2 | 3 | 4 | 5
  if (rounded === 1 || rounded === 2 || rounded === 3 || rounded === 4 || rounded === 5) {
    return CLIMATE_SURVEY_LIKERT_WEIGHT_BY_SCORE[rounded]
  }
  return CLIMATE_SURVEY_LIKERT_WEIGHT_BY_SCORE[3]
}

export function climateSurveyLikertToEnpsNote(normalizedScore: number): number {
  return climateSurveyLikertWeight(normalizedScore) * 10
}

export function classifyClimateSurveyEnpsNote(note: number): "promoter" | "neutral" | "detractor" {
  if (note >= 9) return "promoter"
  if (note >= 7) return "neutral"
  return "detractor"
}

export function computeClimateSurveyFavorabilityPercent(normalizedScores: number[]): number | null {
  if (normalizedScores.length === 0) return null
  const favorableCount = normalizedScores.filter((score) => score >= 4).length
  return Math.round((favorableCount / normalizedScores.length) * 100)
}

export function computeClimateSurveyWeightedScorePercent(normalizedScores: number[]): number | null {
  if (normalizedScores.length === 0) return null
  const avgWeight =
    normalizedScores.reduce((sum, score) => sum + climateSurveyLikertWeight(score), 0) / normalizedScores.length
  return Math.round(avgWeight * 100)
}

export function computeClimateSurveyEnpsFromNotes(notes: number[]): ClimateSurveyEnpsBreakdown {
  if (notes.length === 0) return emptyEnpsBreakdown()

  let promoters = 0
  let neutrals = 0
  let detractors = 0
  for (const note of notes) {
    const bucket = classifyClimateSurveyEnpsNote(note)
    if (bucket === "promoter") promoters += 1
    else if (bucket === "neutral") neutrals += 1
    else detractors += 1
  }

  const total = promoters + neutrals + detractors
  return {
    promoters,
    neutrals,
    detractors,
    total,
    score: total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null,
  }
}

export function computeClimateSurveyEnpsFromNormalizedScores(normalizedScores: number[]): ClimateSurveyEnpsBreakdown {
  return computeClimateSurveyEnpsFromNotes(normalizedScores.map((score) => climateSurveyLikertToEnpsNote(score)))
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function respondentEnpsNotes(normalizedByResponse: Map<string, number[]>): number[] {
  const notes: number[] = []
  for (const scores of normalizedByResponse.values()) {
    const avgScore = average(scores)
    if (avgScore === null) continue
    notes.push(climateSurveyLikertToEnpsNote(avgScore))
  }
  return notes
}

function aggregateNormalizedScores(
  normalizedScores: number[],
  normalizedByResponse: Map<string, number[]>,
): ClimateSurveyAggregatedMetrics {
  return {
    answerCount: normalizedScores.length,
    respondentCount: normalizedByResponse.size,
    favorabilityPercent: computeClimateSurveyFavorabilityPercent(normalizedScores),
    weightedScorePercent: computeClimateSurveyWeightedScorePercent(normalizedScores),
    enps: computeClimateSurveyEnpsFromNotes(respondentEnpsNotes(normalizedByResponse)),
  }
}

function pushNormalized(
  byResponse: Map<string, number[]>,
  responseId: string,
  normalizedScore: number,
): void {
  const scores = byResponse.get(responseId) ?? []
  scores.push(normalizedScore)
  byResponse.set(responseId, scores)
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

export function computeClimateSurveyMetricsBreakdown(
  answers: ClimateSurveyMetricAnswerInput[],
  questions: ClimateSurveyMetricQuestionInput[],
): ClimateSurveyMetricsBreakdown {
  const questionMeta = new Map(questions.map((question) => [question.id, question]))

  const overallScores: number[] = []
  const overallByResponse = new Map<string, number[]>()
  const byQuestionScores = new Map<string, number[]>()
  const byQuestionResponses = new Map<string, Map<string, number[]>>()
  const byTopicScores = new Map<ClimateSurveyDimension, number[]>()
  const byTopicResponses = new Map<ClimateSurveyDimension, Map<string, number[]>>()
  const byDepartmentScores = new Map<string, number[]>()
  const byDepartmentResponses = new Map<string, Map<string, number[]>>()

  for (const answer of answers) {
    const meta = questionMeta.get(answer.questionId)
    if (meta === undefined) continue
    const normalized = normalizeClimateSurveyLikertScore(answer.score, meta.scoreDirection)

    overallScores.push(normalized)
    pushNormalized(overallByResponse, answer.responseId, normalized)

    const questionScores = byQuestionScores.get(answer.questionId) ?? []
    questionScores.push(normalized)
    byQuestionScores.set(answer.questionId, questionScores)
    const questionResponses = byQuestionResponses.get(answer.questionId) ?? new Map<string, number[]>()
    pushNormalized(questionResponses, answer.responseId, normalized)
    byQuestionResponses.set(answer.questionId, questionResponses)

    const topicScores = byTopicScores.get(meta.dimension) ?? []
    topicScores.push(normalized)
    byTopicScores.set(meta.dimension, topicScores)
    const topicResponses = byTopicResponses.get(meta.dimension) ?? new Map<string, number[]>()
    pushNormalized(topicResponses, answer.responseId, normalized)
    byTopicResponses.set(meta.dimension, topicResponses)

    if (answer.departmentId !== null) {
      const departmentScores = byDepartmentScores.get(answer.departmentId) ?? []
      departmentScores.push(normalized)
      byDepartmentScores.set(answer.departmentId, departmentScores)
      const departmentResponses = byDepartmentResponses.get(answer.departmentId) ?? new Map<string, number[]>()
      pushNormalized(departmentResponses, answer.responseId, normalized)
      byDepartmentResponses.set(answer.departmentId, departmentResponses)
    }
  }

  const byQuestion = new Map<string, ClimateSurveyAggregatedMetrics>()
  for (const question of questions) {
    byQuestion.set(
      question.id,
      aggregateNormalizedScores(
        byQuestionScores.get(question.id) ?? [],
        byQuestionResponses.get(question.id) ?? new Map<string, number[]>(),
      ),
    )
  }

  const byTopic = new Map<ClimateSurveyDimension, ClimateSurveyAggregatedMetrics>()
  for (const dimension of CLIMATE_SURVEY_DIMENSION_ORDER) {
    byTopic.set(
      dimension,
      aggregateNormalizedScores(
        byTopicScores.get(dimension) ?? [],
        byTopicResponses.get(dimension) ?? new Map<string, number[]>(),
      ),
    )
  }

  const byDepartment = new Map<string, ClimateSurveyAggregatedMetrics>()
  for (const [departmentId, scores] of byDepartmentScores.entries()) {
    byDepartment.set(
      departmentId,
      aggregateNormalizedScores(
        scores,
        byDepartmentResponses.get(departmentId) ?? new Map<string, number[]>(),
      ),
    )
  }

  return {
    overall: aggregateNormalizedScores(overallScores, overallByResponse),
    byQuestion,
    byTopic,
    byDepartment,
  }
}

export function getClimateSurveyAggregatedMetricsOrEmpty(
  metrics: ClimateSurveyAggregatedMetrics | undefined,
): ClimateSurveyAggregatedMetrics {
  return metrics ?? emptyAggregatedMetrics()
}
