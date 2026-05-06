export type ScoreDirection = "higher_is_better" | "lower_is_better"

export interface HealthSurveyDispatchDashboardStats {
  id: string
  departmentId: string
  status: string
  scheduledAt: Date
  dispatchedAt: Date | null
  departmentName: string
  frequency: string
  totalRecipients: number
  totalResponses: number
  notResponded: number
  adherenceRate: number
  avgScore: number | null
  signedLinkToken: string | null
  questions: {
    id: string
    text: string
    order: number
    scoreDirection: ScoreDirection
    avgScore: number | null
    distribution: { score: number; count: number }[]
  }[]
}

export interface HealthSurveyConfigurationType {
  id: string
  tenantId: string
  departmentId: string
  frequency: string
  workStartTime: string
  workEndTime: string
  workDays: number[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface HealthSurveyQuestionType {
  id: string
  tenantId: string
  healthSurveyConfigurationId: string
  text: string
  order: number
}

export interface HealthSurveyDispatchType {
  id: string
  tenantId: string
  healthSurveyConfigurationId: string
  scheduledAt: Date
  dispatchedAt: Date | null
  status: "scheduled" | "available" | "failed" | "cancelled"
  totalRecipients: number
  totalResponses: number
  createdAt: Date
}

export type ConsentStatus = "accepted" | "needs_consent"

export type HealthSurveyTokenValidation =
  | {
      valid: true
      employeeName: string
      consentStatus: ConsentStatus
      consentTermVersionId: string | null
      consentTermContent: string | null
      token: { id: string; dispatchId: string; workStartTime: string; workEndTime: string; tenantId: string }
      questions: { id: string; text: string; order: number; scoreDirection: ScoreDirection }[]
      timezone: string
    }
  | { valid: false; error: string }

export interface CreateHealthSurveyConfigInput {
  departmentId: string
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly"
  workStartTime: string
  workEndTime: string
  workDays: number[]
  questions: { text: string; order: number; scoreDirection: ScoreDirection }[]
}

export interface GlobalHealthSurveyConfigInput {
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly"
  workStartTime: string
  workEndTime: string
  workDays: number[]
  questions: { text: string; order: number; scoreDirection: ScoreDirection }[]
}

export interface ExistingGlobalHealthSurveyConfig {
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly"
  workStartTime: string
  workEndTime: string
  workDays: number[]
  questions: { id: string; text: string; order: number; scoreDirection: ScoreDirection }[]
}

export interface SubmitHealthSurveyInput {
  token: string
  answers: { questionId: string; score: number }[]
}

export interface CreateHealthSurveyResponseInput {
  tenantId: string
  dispatchId: string
  tokenId: string
  answers: { questionId: string; score: number }[]
}

export interface CreateHealthSurveyTokenInput {
  tenantId: string
  dispatchId: string
  employeeId: string
  token: string
  expiresAt: Date
  workStartTime: string
  workEndTime: string
}

export interface CreateHealthSurveyAdherenceAlertInput {
  tenantId: string
  departmentId: string
  adherenceRate: number
  responseCount: number
  totalRecipients: number
}
