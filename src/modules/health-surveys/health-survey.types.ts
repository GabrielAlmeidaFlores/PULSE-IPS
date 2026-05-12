export type ScoreDirection = "higher_is_better" | "lower_is_better"

export interface HealthSurveyDispatchDashboardStats {
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
  departments: { id: string; name: string }[]
  name: string
  description: string | null
  frequency: string
  scheduledDayOfMonth: number | null
  dispatchTime: string
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
  departmentIds: string[]
  name: string
  description: string | undefined
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly"
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  questions: { text: string; order: number; scoreDirection: ScoreDirection }[]
}

export interface UpdateHealthSurveyConfigInput {
  name: string
  description: string | undefined
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly"
  scheduledDayOfMonth: number | null
  dispatchTime: string
  workDays: number[]
  departmentIds: string[]
  questions: { text: string; order: number; scoreDirection: ScoreDirection }[]
}

export interface SubmitHealthSurveyInput {
  token: string
  answers: { questionId: string; score: number }[]
}

export interface CreateHealthSurveyResponseInput {
  tenantId: string
  dispatchId: string
  departmentId: string | null
  tokenId: string
  answers: { questionId: string; score: number }[]
}

export interface CreateHealthSurveyTokenInput {
  tenantId: string
  dispatchId: string
  employeeId: string
  token: string
  shortCode?: string
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
