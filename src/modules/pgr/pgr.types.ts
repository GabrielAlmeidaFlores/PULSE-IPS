export interface PgrReviewType {
  id: string
  tenantId: string
  period: string
  fileUrl: string | null
  status: "pending" | "generated" | "reviewed"
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PgrReportData {
  organizationName: string
  period: string
  totalEmployees: number
  departments: {
    name: string
    employeeCount: number
    avgScore: number
    responseRate: number
  }[]
  generatedAt: Date
}

export interface CreatePgrReviewInput {
  tenantId: string
  period: string
  status: "pending" | "generated" | "reviewed"
  reviewedAt: Date
}

export interface CreatePgrAlertInput {
  tenantId: string
  type: string
  severity: string
  message: string
}
