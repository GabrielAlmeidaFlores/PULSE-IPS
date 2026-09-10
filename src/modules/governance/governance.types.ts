export type GovernanceWaveStatus = "completed" | "scheduled" | "late" | "failed" | "cancelled"

export interface GovernanceWaveTimelineItem {
  id: string
  configName: string
  scheduledAt: Date
  dispatchedAt: Date | null
  status: GovernanceWaveStatus
}

export interface GovernanceDashboard {
  climate: {
    waveConfigName: string | null
    waveScheduledAt: Date | null
    adherencePercent: number | null
    favorabilityPercent: number | null
    enps: number | null
  }
  alerts: {
    unresolved: number
    criticalUnresolved: number
  }
  actionPlans: {
    completed: number
    inProgress: number
    overdue: number
  }
  workforce: {
    competencia: string | null
    headcount: number
    turnoverPercent: number | null
    absenteeismPercent: number | null
  }
  timeline: GovernanceWaveTimelineItem[]
}
