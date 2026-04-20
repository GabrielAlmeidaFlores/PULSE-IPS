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
  avgScore: number
  responseCount: number
}

export interface CreatePgrAlertInput {
  tenantId: string
  type: string
  severity: string
  message: string
}
