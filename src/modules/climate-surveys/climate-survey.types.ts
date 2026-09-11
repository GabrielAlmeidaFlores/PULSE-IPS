import type { ClimateSurveyFunnelMetrics } from "@/modules/climate-surveys/climate-survey-analytics.types"

export type { ClimateSurveyFunnelMetrics }

export type ScoreDirection = "higher_is_better" | "lower_is_better"

export type ClimateSurveyDimension = string

export interface ClimateSurveySystemTopicDefinition {
  key: string
  label: string
  sortOrder: number
}

export const CLIMATE_SURVEY_SYSTEM_TOPICS: ClimateSurveySystemTopicDefinition[] = [
  { key: "job_satisfaction", label: "Satisfação no Trabalho", sortOrder: 1 },
  { key: "internal_communication", label: "Comunicação Interna", sortOrder: 2 },
  { key: "relationships", label: "Relacionamento com Colegas e Liderança", sortOrder: 3 },
  { key: "recognition_reward", label: "Reconhecimento e Recompensa", sortOrder: 4 },
  { key: "professional_development", label: "Desenvolvimento Profissional", sortOrder: 5 },
  { key: "work_life_balance", label: "Equilíbrio Vida Pessoal e Profissional", sortOrder: 6 },
  { key: "organizational_culture", label: "Cultura Organizacional", sortOrder: 7 },
  { key: "leadership_trust", label: "Confiança na Liderança", sortOrder: 8 },
]

export const CLIMATE_SURVEY_DIMENSION_ORDER: ClimateSurveyDimension[] = CLIMATE_SURVEY_SYSTEM_TOPICS.map(
  (topic) => topic.key,
)

export const CLIMATE_SURVEY_DIMENSION_LABELS: Record<string, string> = Object.fromEntries(
  CLIMATE_SURVEY_SYSTEM_TOPICS.map((topic) => [topic.key, topic.label]),
)

export interface ClimateSurveyTopic {
  id: string
  tenantId: string
  key: string
  label: string
  isSystem: boolean
  isActive: boolean
  sortOrder: number
}

export interface ClimateSurveyTopicOption {
  id: string
  key: string
  label: string
  isSystem: boolean
  isActive: boolean
}

export function resolveClimateSurveyTopicLabel(
  key: string,
  topicLabels?: ReadonlyMap<string, string>,
): string {
  const fromCatalog = topicLabels?.get(key)
  if (fromCatalog !== undefined) return fromCatalog
  return CLIMATE_SURVEY_DIMENSION_LABELS[key] ?? key
}

export const CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT = 70

export type ClimateSurveyMetricStatus = "above_goal" | "attention" | "critical" | "unavailable"

const CLIMATE_SURVEY_LEGACY_TOPIC_ALIASES: Record<string, string> = {
  belonging: "job_satisfaction",
  communication: "internal_communication",
  recognition: "recognition_reward",
  workload: "work_life_balance",
  other: "organizational_culture",
  leadership: "leadership_trust",
}

export function toClimateSurveyDimension(value: string): ClimateSurveyDimension {
  return CLIMATE_SURVEY_LEGACY_TOPIC_ALIASES[value] ?? value
}

export function isClimateSurveyLegacyTopicAlias(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(CLIMATE_SURVEY_LEGACY_TOPIC_ALIASES, value)
}

export function climateSurveyMetricStatus(valuePercent: number | null, goalPercent = CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT): ClimateSurveyMetricStatus {
  if (valuePercent === null) return "unavailable"
  if (valuePercent >= goalPercent) return "above_goal"
  if (valuePercent >= goalPercent - 20) return "attention"
  return "critical"
}

export interface ClimateSurveyDispatchDashboardStats {
  id: string
  status: string
  scheduledAt: Date
  dispatchedAt: Date | null
  configName: string
  frequency: string
  departments: { id: string; name: string }[]
  totalRecipients: number
  totalResponses: number
  notResponded: number
  adherenceRate: number
  avgScore: number | null
  favorabilityPercent: number | null
  weightedScorePercent: number | null
  enps: number | null
  enpsBreakdown: ClimateSurveyEnpsBreakdown
  signedLinkToken: string | null
  minRespondentsPercent: number
  requiredRespondents: number
  questions: {
    id: string
    text: string
    order: number
    scoreDirection: ScoreDirection
    dimension: ClimateSurveyDimension
    avgScore: number | null
    favorabilityPercent: number | null
    weightedScorePercent: number | null
    enps: number | null
    distribution: { score: number; count: number }[]
  }[]
  dimensionScores: {
    dimension: ClimateSurveyDimension
    label: string
    avgScore: number | null
    favorabilityPercent: number | null
    weightedScorePercent: number | null
    enps: number | null
    questionCount: number
  }[]
  departmentScores: {
    departmentId: string
    departmentName: string
    favorabilityPercent: number | null
    weightedScorePercent: number | null
    enps: number | null
    answerCount: number
    respondentCount: number
  }[]
}

export interface ClimateSurveyEnpsBreakdown {
  promoters: number
  neutrals: number
  detractors: number
  total: number
  score: number | null
}

export interface ClimateSurveyTopicRadarPoint {
  dimension: ClimateSurveyDimension
  label: string
  scorePercent: number | null
  goalPercent: number
  status: ClimateSurveyMetricStatus
}

export const CLIMATE_SURVEY_FAVORABILITY_ATTENTION_GAP_PERCENT = 10

export type ClimateSurveyFavorabilityBand = "at_goal" | "below_goal" | "critical"

export function resolveClimateSurveyFavorabilityBand(
  favorabilityPercent: number,
  goalPercent: number,
): ClimateSurveyFavorabilityBand {
  if (favorabilityPercent >= goalPercent) return "at_goal"
  if (favorabilityPercent >= goalPercent - CLIMATE_SURVEY_FAVORABILITY_ATTENTION_GAP_PERCENT) return "below_goal"
  return "critical"
}

export interface ClimateSurveyTopicFavorabilityPoint {
  dimension: ClimateSurveyDimension
  label: string
  favorabilityPercent: number | null
  band: ClimateSurveyFavorabilityBand | null
}

export interface ClimateSurveyWaveEvolutionPoint {
  dispatchId: string
  label: string
  scheduledAt: Date
  adherencePercent: number
  favorabilityPercent: number | null
  enps: number | null
  overallScorePercent: number | null
}

export const CLIMATE_SURVEY_HEATMAP_STRONG_GAP_PERCENT = 5
export const CLIMATE_SURVEY_HEATMAP_ATTENTION_GAP_PERCENT = 10

export type ClimateSurveyHeatmapBand = "strong" | "on_goal" | "attention" | "critical"

export function resolveClimateSurveyHeatmapBand(
  favorabilityPercent: number,
  goalPercent: number,
): ClimateSurveyHeatmapBand {
  if (favorabilityPercent >= goalPercent + CLIMATE_SURVEY_HEATMAP_STRONG_GAP_PERCENT) return "strong"
  if (favorabilityPercent >= goalPercent) return "on_goal"
  if (favorabilityPercent >= goalPercent - CLIMATE_SURVEY_HEATMAP_ATTENTION_GAP_PERCENT) return "attention"
  return "critical"
}

export interface ClimateSurveyHeatmapCell {
  dimension: ClimateSurveyDimension
  departmentId: string
  favorabilityPercent: number | null
  band: ClimateSurveyHeatmapBand | null
  responseCount: number | null
}

export function resolveClimateSurveyEnpsHeatmapBand(score: number): ClimateSurveyHeatmapBand {
  if (score >= 50) return "strong"
  if (score >= 30) return "on_goal"
  if (score >= 0) return "attention"
  return "critical"
}

export interface ClimateSurveyHeatmapDepartmentTotal {
  departmentId: string
  enps: number | null
  scorePercent: number | null
}

export interface ClimateSurveyModuleDashboard {
  wave: {
    id: string
    configName: string
    scheduledAt: Date
    dispatchedAt: Date | null
    status: string
    departmentNames: string[]
  } | null
  kpis: {
    adherencePercent: number | null
    totalResponses: number
    totalRecipients: number
    favorabilityPercent: number | null
    enps: number | null
    adherenceStatus: ClimateSurveyMetricStatus
    favorabilityStatus: ClimateSurveyMetricStatus
    enpsStatus: ClimateSurveyMetricStatus
  }
  corporateGoalPercent: number
  minRespondentsPercent: number
  requiredRespondents: number
  radar: ClimateSurveyTopicRadarPoint[]
  topicFavorability: ClimateSurveyTopicFavorabilityPoint[]
  evolution: ClimateSurveyWaveEvolutionPoint[]
  enpsBreakdown: ClimateSurveyEnpsBreakdown
  heatmap: {
    topics: { dimension: ClimateSurveyDimension; label: string }[]
    departments: { id: string; name: string }[]
    cells: ClimateSurveyHeatmapCell[]
    departmentTotals: ClimateSurveyHeatmapDepartmentTotal[]
    companyEnps: number | null
    companyScorePercent: number | null
  }
  hasEnoughRespondents: boolean
  funnel: ClimateSurveyFunnelMetrics
}

export const CLIMATE_SURVEY_ADHERENCE_REINFORCE_THRESHOLD_PERCENT = 75
export const CLIMATE_SURVEY_ADHERENCE_EXCELLENT_THRESHOLD_PERCENT = 90

export type ClimateSurveyAdherenceStatusLabel = "Excelente" | "Boa" | "Reforçar"

export type ClimateSurveyAdherenceChannelKey = "messaging" | "email"

export const CLIMATE_SURVEY_ADHERENCE_CHANNEL_LABELS: Record<ClimateSurveyAdherenceChannelKey, string> = {
  messaging: "Mensagem",
  email: "E-mail",
}

export function resolveClimateSurveyAdherenceStatusLabel(adherencePercent: number): ClimateSurveyAdherenceStatusLabel {
  if (adherencePercent >= CLIMATE_SURVEY_ADHERENCE_EXCELLENT_THRESHOLD_PERCENT) return "Excelente"
  if (adherencePercent >= CLIMATE_SURVEY_ADHERENCE_REINFORCE_THRESHOLD_PERCENT) return "Boa"
  return "Reforçar"
}

export interface ClimateSurveyAdherenceDepartmentRow {
  departmentId: string
  departmentName: string
  totalEmployees: number
  totalResponses: number
  adherencePercent: number
  channels: ClimateSurveyAdherenceChannelKey[]
  statusLabel: ClimateSurveyAdherenceStatusLabel
}

export interface ClimateSurveyAdherenceChannelComparison {
  channel: ClimateSurveyAdherenceChannelKey
  label: string
  totalRecipients: number
  totalResponses: number
  adherencePercent: number
}

export interface ClimateSurveyAdherenceReminderArea {
  departmentId: string
  departmentName: string
  adherencePercent: number
  pendingResponses: number
}

export interface ClimateSurveyAdherenceOverview {
  wave: {
    id: string
    configName: string
    scheduledAt: Date
    dispatchedAt: Date | null
    status: string
    sendViaMessaging: boolean
    sendViaSignedLink: boolean
    totalRecipients: number
    totalResponses: number
    adherencePercent: number
    pendingReminderCount: number
  } | null
  departments: ClimateSurveyAdherenceDepartmentRow[]
  channelComparison: ClimateSurveyAdherenceChannelComparison[]
  channelReading: string | null
  reminderAreas: ClimateSurveyAdherenceReminderArea[]
  canSendReminderNow: boolean
}

export interface ClimateSurveyConfigurationType {
  id: string
  tenantId: string
  departments: { id: string; name: string }[]
  name: string
  description: string | null
  frequency: string
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  respectEmployeeSchedule: boolean
  tokenExpiryHours: number
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ClimateSurveyQuestionType {
  id: string
  tenantId: string
  climateSurveyConfigurationId: string
  text: string
  order: number
  dimension: ClimateSurveyDimension
}

export interface ClimateSurveyDispatchType {
  id: string
  tenantId: string
  climateSurveyConfigurationId: string
  scheduledAt: Date
  dispatchedAt: Date | null
  status: "scheduled" | "available" | "failed" | "cancelled"
  createdAt: Date
}

export type ConsentStatus = "accepted" | "needs_consent"

export type ClimateSurveyTokenValidation =
  | {
      valid: true
      employeeName: string
      consentStatus: ConsentStatus
      consentTermVersionId: string | null
      consentTermContent: string | null
      token: { id: string; dispatchId: string; workStartTime: string; workEndTime: string; tenantId: string }
      questions: { id: string; text: string; order: number; scoreDirection: ScoreDirection; dimension: ClimateSurveyDimension; dimensionLabel: string }[]
      timezone: string
    }
  | { valid: false; error: string }

export interface ClimateSurveyQuestionInput {
  text: string
  order: number
  scoreDirection: ScoreDirection
  dimension: ClimateSurveyDimension
}

export type ClimateSurveyFrequency =
  | "once"
  | "daily"
  | "twice_weekly"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semiannual"

export const CLIMATE_SURVEY_FREQUENCY_LABELS: Record<ClimateSurveyFrequency, string> = {
  once: "Pesquisa única",
  daily: "Diária",
  twice_weekly: "2× por semana",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
}

export const CLIMATE_SURVEY_CAMPAIGN_FREQUENCIES: ClimateSurveyFrequency[] = ["monthly", "quarterly", "semiannual", "once"]

export type ClimateSurveyCampaignChannel = "messaging" | "email"

export const CLIMATE_SURVEY_CAMPAIGN_CHANNEL_LABELS: Record<ClimateSurveyCampaignChannel, string> = {
  messaging: "Mensagem",
  email: "E-mail",
}

export type ClimateSurveyCampaignTimingMode = "now" | "schedule" | "reminder_48h"

export interface ClimateSurveyCampaignSetup {
  configs: {
    id: string
    name: string
    frequency: string
    sendViaMessaging: boolean
    sendViaSignedLink: boolean
    tokenExpiryHours: number
    departmentIds: string[]
  }[]
  departments: {
    id: string
    name: string
    employeeCount: number
  }[]
  messageTemplate: string
  hasMessagingFeature: boolean
}

export interface LaunchClimateSurveyCampaignInput {
  configId: string
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  frequency: ClimateSurveyFrequency
  timingMode: ClimateSurveyCampaignTimingMode
  scheduledAt: Date
  departmentIds: string[]
}

export interface CreateClimateSurveyConfigInput {
  departmentIds: string[]
  name: string
  description: string | undefined
  frequency: ClimateSurveyFrequency
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  respectEmployeeSchedule: boolean
  tokenExpiryHours: number
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  questions: ClimateSurveyQuestionInput[]
}

export interface UpdateClimateSurveyConfigInput {
  name: string
  description: string | undefined
  frequency: ClimateSurveyFrequency
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  respectEmployeeSchedule: boolean
  tokenExpiryHours: number
  sendViaMessaging: boolean
  sendViaSignedLink: boolean
  departmentIds: string[]
  questions: ClimateSurveyQuestionInput[]
}

export interface SubmitClimateSurveyInput {
  token: string
  answers: { questionId: string; score: number }[]
  openComment?: string
}

export type ClimateSurveyEnpsCategory = "promoter" | "neutral" | "detractor"

export type ClimateSurveyEnpsStatusLabel = "Excelente" | "Muito Bom" | "Médio" | "Atenção" | "Crítico"

export function resolveClimateSurveyEnpsStatusLabel(score: number): ClimateSurveyEnpsStatusLabel {
  if (score >= 50) return "Excelente"
  if (score >= 30) return "Muito Bom"
  if (score >= 10) return "Médio"
  if (score >= 0) return "Atenção"
  return "Crítico"
}

export function formatClimateSurveyPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`
}

export function formatClimateSurveyEnps(value: number | null): string {
  if (value === null) return "—"
  return value > 0 ? `+${value}` : String(value)
}

export const CLIMATE_SURVEY_READING_LOW_THRESHOLD_PERCENT = 70

export type ClimateSurveyReadingPill = "critical" | "attention" | "informative"

export const CLIMATE_SURVEY_READING_PILL_LABELS: Record<ClimateSurveyReadingPill, string> = {
  critical: "Crítico",
  attention: "Atenção",
  informative: "Informativo",
}

export function resolveClimateSurveyReadingPill(currentPercent: number, delta: number): ClimateSurveyReadingPill {
  if (currentPercent < CLIMATE_SURVEY_READING_LOW_THRESHOLD_PERCENT) {
    return delta < 0 ? "critical" : "attention"
  }
  return delta < 0 ? "attention" : "informative"
}

export interface CreateClimateSurveyResponseInput {
  tenantId: string
  dispatchId: string
  departmentId: string | null
  tokenId: string
  answers: { questionId: string; score: number }[]
  openComment?: string
  enpsCategory?: ClimateSurveyEnpsCategory
}

export interface CreateClimateSurveyTokenInput {
  id: string
  tenantId: string
  dispatchId: string
  employeeId: string
  token: string
  shortCode?: string
  expiresAt: Date
  workStartTime: string
  workEndTime: string
  workDays?: number[]
}

export interface CreateClimateSurveyAdherenceAlertInput {
  tenantId: string
  departmentId: string
  adherenceRate: number
  responseCount: number
  totalRecipients: number
}

export const CLIMATE_SURVEY_MAX_QUESTIONS = 60
