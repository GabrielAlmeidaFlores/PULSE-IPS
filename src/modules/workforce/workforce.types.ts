export interface WorkforceMonthlyRecord {
  competencia: string
  employeeName: string
  document: string | null
  registration: string | null
  departmentName: string | null
  admissionDate: Date | null
  terminationDate: Date | null
  expectedHours: number | null
  justifiedAbsenceHours: number | null
  unjustifiedAbsenceHours: number | null
  createdAt: Date
}

export interface WorkforceKpis {
  headcount: number
  admissions: number
  terminations: number
  turnoverPercent: number | null
  absenteeismPercent: number | null
  expectedHours: number
  absentHours: number
}

export interface WorkforceDepartmentRow {
  departmentName: string
  headcount: number
  admissions: number
  terminations: number
  turnoverPercent: number | null
  absenteeismPercent: number | null
}

export interface WorkforceEvolutionPoint {
  competencia: string
  headcount: number
  turnoverPercent: number | null
  absenteeismPercent: number | null
}

export interface WorkforceDashboard {
  competencias: string[]
  selectedCompetencia: string | null
  kpis: WorkforceKpis
  departments: WorkforceDepartmentRow[]
  evolution: WorkforceEvolutionPoint[]
}

export type WorkforceRiskLevel = "high" | "medium" | "low"

export interface WorkforceCrossAnalysisRow {
  departmentName: string
  headcount: number
  absenteeismPercent: number | null
  turnoverPercent: number | null
  climateScorePercent: number | null
  climateFavorabilityPercent: number | null
  climateEnps: number | null
  riskLevel: WorkforceRiskLevel
}

export interface WorkforceCrossAnalysis {
  competencias: string[]
  competencia: string | null
  climateWaveId: string | null
  rows: WorkforceCrossAnalysisRow[]
}

export type WorkforceInsightKind = "root_cause" | "burnout_risk" | "action_suggestion"

export type WorkforceInsightSeverity = "high" | "medium" | "low"

export interface WorkforceInsight {
  id: string
  tenantId: string
  competencia: string
  kind: WorkforceInsightKind
  severity: WorkforceInsightSeverity
  departmentName: string | null
  title: string
  description: string
  actionPlanId: string | null
  createdAt: Date
}

export interface CreateWorkforceInsightInput {
  kind: WorkforceInsightKind
  severity: WorkforceInsightSeverity
  departmentName?: string
  title: string
  description: string
}
