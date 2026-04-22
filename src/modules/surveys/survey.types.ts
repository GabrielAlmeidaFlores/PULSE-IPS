export type ScoreDirection = "higher_is_better" | "lower_is_better"

export interface DispatchDashboardStats {
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
  questions: {
    id: string
    text: string
    order: number
    scoreDirection: ScoreDirection
    avgScore: number | null
    distribution: { score: number; count: number }[]
  }[]
}

export interface SurveyConfigurationType {
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

export interface SurveyQuestionType {
  id: string
  tenantId: string
  surveyConfigurationId: string
  text: string
  order: number
}

export interface SurveyDispatchType {
  id: string
  tenantId: string
  surveyConfigurationId: string
  scheduledAt: Date
  dispatchedAt: Date | null
  status: "scheduled" | "sent" | "failed" | "cancelled"
  totalRecipients: number
  totalResponses: number
  createdAt: Date
}

export type ConsentStatus = "accepted" | "needs_consent"

export type SurveyTokenValidation =
  | {
      valid: true
      employeeName: string
      consentStatus: ConsentStatus
      consentTermVersionId: string | null
      consentTermContent: string | null
      token: { id: string; dispatchId: string; employeeId: string; workStartTime: string; workEndTime: string; tenantId: string }
      questions: { id: string; text: string; order: number; scoreDirection: ScoreDirection }[]
      timezone: string
    }
  | { valid: false; error: string }

export interface CreateSurveyConfigInput {
  departmentId: string
  frequency: "daily" | "twice_weekly" | "weekly" | "biweekly" | "monthly"
  workStartTime: string
  workEndTime: string
  workDays: number[]
  questions: { text: string; order: number; scoreDirection: ScoreDirection }[]
}

export interface SubmitSurveyInput {
  token: string
  answers: { questionId: string; score: number }[]
}

export interface CreateSurveyResponseInput {
  tenantId: string
  dispatchId: string
  tokenId: string
  answers: { questionId: string; score: number }[]
}

export interface CreateSurveyTokenInput {
  tenantId: string
  dispatchId: string
  employeeId: string
  token: string
  expiresAt: Date
  workStartTime: string
  workEndTime: string
}

export interface CreateAdherenceAlertInput {
  tenantId: string
  departmentId: string
  adherenceRate: number
  responseCount: number
  totalRecipients: number
}

export interface CreateMessageLogInput {
  tenantId: string
  employeeId: string
  type: "consent_invite" | "survey_dispatch" | "survey_resend"
  provider: string
  status: "sent" | "failed"
}
