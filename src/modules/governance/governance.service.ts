import { getAlertStats } from "@/modules/alerts/alert.service"
import { countClimateSurveyActionPlanIndicators } from "@/modules/action-plans/action-plan.repository"
import { getClimateSurveyModuleDashboard } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { findClimateSurveyDispatchTimeline } from "@/modules/climate-surveys/climate-survey.repository"
import { getWorkforceDashboard } from "@/modules/workforce/workforce.service"
import type {
  GovernanceDashboard,
  GovernanceWaveStatus,
  GovernanceWaveTimelineItem,
} from "@/modules/governance/governance.types"

const TIMELINE_SIZE = 24

function resolveGovernanceWaveStatus(
  status: string,
  scheduledAt: Date,
  dispatchedAt: Date | null,
  now: Date,
): GovernanceWaveStatus {
  if (status === "failed") return "failed"
  if (status === "cancelled") return "cancelled"
  if (status === "available" || dispatchedAt !== null) return "completed"
  return scheduledAt.getTime() < now.getTime() ? "late" : "scheduled"
}

export async function getGovernanceDashboard(tenantId: string): Promise<GovernanceDashboard> {
  const [climate, alerts, actionPlans, workforce, timelineRows] = await Promise.all([
    getClimateSurveyModuleDashboard(tenantId),
    getAlertStats(tenantId),
    countClimateSurveyActionPlanIndicators(tenantId),
    getWorkforceDashboard(tenantId),
    findClimateSurveyDispatchTimeline(tenantId, TIMELINE_SIZE),
  ])

  const now = new Date()
  const timeline: GovernanceWaveTimelineItem[] = timelineRows.map((row) => ({
    id: row.id,
    configName: row.configName,
    scheduledAt: row.scheduledAt,
    dispatchedAt: row.dispatchedAt,
    status: resolveGovernanceWaveStatus(row.status, row.scheduledAt, row.dispatchedAt, now),
  }))

  return {
    climate: {
      waveConfigName: climate.wave?.configName ?? null,
      waveScheduledAt: climate.wave?.scheduledAt ?? null,
      adherencePercent: climate.kpis.adherencePercent,
      favorabilityPercent: climate.kpis.favorabilityPercent,
      enps: climate.kpis.enps,
    },
    alerts: {
      unresolved: alerts.unresolved,
      criticalUnresolved: alerts.criticalUnresolved,
    },
    actionPlans: {
      completed: actionPlans.completed,
      inProgress: actionPlans.inProgress,
      overdue: actionPlans.overdue,
    },
    workforce: {
      competencia: workforce.selectedCompetencia,
      headcount: workforce.kpis.headcount,
      turnoverPercent: workforce.kpis.turnoverPercent,
      absenteeismPercent: workforce.kpis.absenteeismPercent,
    },
    timeline,
  }
}
