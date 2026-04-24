export interface ActionPlanSuggestion {
  key: string
  title: string
  description: string
  priority: "low" | "medium" | "high"
  reason: string
  tasks: string[]
}

export interface AlertWithContext {
  id: string
  type: string
  severity: string
  departmentId: string | null
  department: { name: string } | null
  message: string
  createdAt: Date
}

export interface LowAdherenceDispatch {
  id: string
  totalRecipients: number
  totalResponses: number
  dispatchedAt: Date | null
  surveyConfiguration: { department: { name: string } | null } | null
}

export interface ReportItem {
  category: string | null
  status: string
  createdAt: Date
}

export interface ConsentDeptGroup {
  departmentId: string
  _count: { departmentId: number }
}
