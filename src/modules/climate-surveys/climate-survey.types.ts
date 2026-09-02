import type { ClimateSurveyFunnelMetrics } from "@/modules/climate-surveys/climate-survey-analytics.types"

export type { ClimateSurveyFunnelMetrics }

export type ScoreDirection = "higher_is_better" | "lower_is_better"

export type ClimateSurveyDimension =
  | "job_satisfaction"
  | "internal_communication"
  | "relationships"
  | "recognition_reward"
  | "professional_development"
  | "work_life_balance"
  | "organizational_culture"
  | "leadership_trust"

export const CLIMATE_SURVEY_DIMENSION_ORDER: ClimateSurveyDimension[] = [
  "job_satisfaction",
  "internal_communication",
  "relationships",
  "recognition_reward",
  "professional_development",
  "work_life_balance",
  "organizational_culture",
  "leadership_trust",
]

export const CLIMATE_SURVEY_DIMENSION_LABELS: Record<ClimateSurveyDimension, string> = {
  job_satisfaction: "Satisfação no Trabalho",
  internal_communication: "Comunicação Interna",
  relationships: "Relacionamento com Colegas e Liderança",
  recognition_reward: "Reconhecimento e Recompensa",
  professional_development: "Desenvolvimento Profissional",
  work_life_balance: "Equilíbrio Vida Pessoal e Profissional",
  organizational_culture: "Cultura Organizacional",
  leadership_trust: "Confiança na Liderança",
}

export const CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT = 70

export type ClimateSurveyMetricStatus = "above_goal" | "attention" | "critical" | "unavailable"

export function toClimateSurveyDimension(value: string): ClimateSurveyDimension {
  if (value === "job_satisfaction" || value === "belonging") return "job_satisfaction"
  if (value === "internal_communication" || value === "communication") return "internal_communication"
  if (value === "relationships") return "relationships"
  if (value === "recognition_reward" || value === "recognition") return "recognition_reward"
  if (value === "professional_development") return "professional_development"
  if (value === "work_life_balance" || value === "workload") return "work_life_balance"
  if (value === "organizational_culture" || value === "other") return "organizational_culture"
  if (value === "leadership_trust" || value === "leadership") return "leadership_trust"
  return "organizational_culture"
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

export interface ClimateSurveyWaveEvolutionPoint {
  dispatchId: string
  label: string
  scheduledAt: Date
  adherencePercent: number
  favorabilityPercent: number | null
  enps: number | null
  overallScorePercent: number | null
}

export interface ClimateSurveyHeatmapCell {
  dimension: ClimateSurveyDimension
  departmentId: string
  scorePercent: number | null
  status: ClimateSurveyMetricStatus
  responseCount: number | null
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
  evolution: ClimateSurveyWaveEvolutionPoint[]
  enpsBreakdown: ClimateSurveyEnpsBreakdown
  heatmap: {
    topics: { dimension: ClimateSurveyDimension; label: string }[]
    departments: { id: string; name: string }[]
    cells: ClimateSurveyHeatmapCell[]
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
      questions: { id: string; text: string; order: number; scoreDirection: ScoreDirection; dimension: ClimateSurveyDimension }[]
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

export const CLIMATE_SURVEY_CAMPAIGN_FREQUENCIES: ClimateSurveyFrequency[] = ["once", "quarterly", "semiannual"]

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

export interface CreateClimateSurveyResponseInput {
  tenantId: string
  dispatchId: string
  departmentId: string | null
  tokenId: string
  answers: { questionId: string; score: number }[]
  openComment?: string
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

export const CLIMATE_SURVEY_DIMENSION_ZOD_ENUM = [
  "job_satisfaction",
  "internal_communication",
  "relationships",
  "recognition_reward",
  "professional_development",
  "work_life_balance",
  "organizational_culture",
  "leadership_trust",
] as const
