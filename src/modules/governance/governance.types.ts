export type GovernanceWaveStatus = "completed" | "scheduled" | "late" | "failed" | "cancelled"

export interface GovernanceWaveTimelineItem {
  id: string
  configName: string
  scheduledAt: Date
  dispatchedAt: Date | null
  status: GovernanceWaveStatus
}

export interface GovernanceClimateEvolutionPoint {
  dispatchId: string
  label: string
  scheduledAt: Date
  adherencePercent: number
  favorabilityPercent: number | null
  enps: number | null
  overallScorePercent: number | null
}

export interface GovernanceWorkforceEvolutionPoint {
  competencia: string
  headcount: number
  turnoverPercent: number | null
  absenteeismPercent: number | null
}

export interface GovernanceClimateMetrics {
  waveConfigName: string | null
  waveScheduledAt: Date | null
  adherencePercent: number | null
  favorabilityPercent: number | null
  scorePercent: number | null
  enps: number | null
  totalResponses: number
  totalRecipients: number
  corporateGoalPercent: number
  evolution: GovernanceClimateEvolutionPoint[]
}

export interface GovernanceAlertMetrics {
  total: number
  unresolved: number
  criticalUnresolved: number
  resolved: number
}

export interface GovernanceActionPlanMetrics {
  total: number
  open: number
  inProgress: number
  completed: number
  overdue: number
  completionRatePercent: number | null
}

export interface GovernanceWorkforceMetrics {
  competencia: string | null
  headcount: number
  admissions: number
  terminations: number
  turnoverPercent: number | null
  absenteeismPercent: number | null
  evolution: GovernanceWorkforceEvolutionPoint[]
}

export interface GovernanceDashboard {
  climate: GovernanceClimateMetrics
  alerts: GovernanceAlertMetrics
  actionPlans: GovernanceActionPlanMetrics
  workforce: GovernanceWorkforceMetrics
  timeline: GovernanceWaveTimelineItem[]
}
