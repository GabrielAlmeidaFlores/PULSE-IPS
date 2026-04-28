import type { ScoreDirection } from "@/modules/surveys/survey.types"
import type { AlertType, AlertSeverity } from "@/modules/alerts/alert.types"

export interface PgrScoreDistribution {
  questionId: string
  questionText: string
  questionOrder: number
  scoreDirection: ScoreDirection
  departmentId: string
  distribution: { score: number; count: number }[]
}

export interface CreatePgrReviewInput {
  tenantId: string
  period: string
  status: "pending" | "generated" | "reviewed"
  reviewedAt: Date
}

export interface CreatePgrDeptResultInput {
  pgrReviewId: string
  departmentId: string
  departmentName: string
  employeeCount: number
  avgScore: number
  responseCount: number
  totalRecipients: number
}

export interface CreatePgrQuestionResultInput {
  pgrReviewId: string
  departmentId: string
  questionId: string
  questionText: string
  questionOrder: number
  scoreDirection: ScoreDirection
  avgScore: number
  responseCount: number
}

export interface CreatePgrAlertInput {
  tenantId: string
  type: AlertType
  severity: AlertSeverity
  message: string
}
