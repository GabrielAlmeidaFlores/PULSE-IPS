export interface PgrPdfScoreDistItem {
  score: number
  count: number
}

export interface PgrPdfQuestionDist {
  questionId: string
  questionOrder: number
  distribution: PgrPdfScoreDistItem[]
}

export interface PgrPdfDeptQuestion {
  text: string
  order: number
  avgScore: number
  healthIndex: number
  responseCount: number
  scoreDirection: string
}

export interface PgrPdfDept {
  name: string
  healthIndex: number | null
  avgScore: number
  responseCount: number
  totalRecipients: number
  adherencePct: number
  employeeCount: number
  questions: PgrPdfDeptQuestion[]
  healthyQs: number
  warningQs: number
  criticalQs: number
  bestQuestion: { text: string; order: number; healthIndex: number } | null
  worstQuestion: { text: string; order: number; healthIndex: number } | null
  questionDistributions: PgrPdfQuestionDist[]
}

export interface PgrPdfAggregatedQuestion {
  text: string
  order: number
  healthIndex: number
  responseCount: number
  scoreDirection: string
}

export interface PgrPdfInput {
  orgName: string
  period: string
  periodLabel: string
  generatedAt: Date
  status: string
  reviewedAt: Date | null
  nextReviewAt: Date | null
  globalHealthIndex: number | null
  totalEmployees: number
  totalResponses: number
  totalRecipients: number
  adherencePct: number
  healthyDepts: number
  warningDepts: number
  criticalDepts: number
  departments: PgrPdfDept[]
  aggregatedQuestions: PgrPdfAggregatedQuestion[]
}
