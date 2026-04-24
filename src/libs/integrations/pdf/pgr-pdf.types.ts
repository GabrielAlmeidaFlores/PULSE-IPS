export interface PgrPdfDeptQuestion {
  text: string
  order: number
  avgScore: number
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
}

export interface PgrPdfInput {
  orgName: string
  period: string
  periodLabel: string
  generatedAt: Date
  status: string
  reviewedAt: Date | null
  globalHealthIndex: number | null
  totalEmployees: number
  totalResponses: number
  totalRecipients: number
  adherencePct: number
  healthyDepts: number
  warningDepts: number
  criticalDepts: number
  departments: PgrPdfDept[]
}
