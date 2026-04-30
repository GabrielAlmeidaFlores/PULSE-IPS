import type { ScoreDirection } from "@/modules/health-surveys/health-survey.types"
import type { AlertType, AlertSeverity } from "@/modules/alerts/alert.types"

export interface PgrReview {
  id: string
  tenantId: string
  period: string
  fileUrl: string | null
  status: string
  reviewedAt: Date | null
  nextReviewAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PgrQuestionResult {
  id: string
  pgrReviewId: string
  departmentId: string
  questionId: string
  questionText: string
  questionOrder: number
  scoreDirection: string
  avgScore: number
  responseCount: number
  createdAt: Date
}

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
