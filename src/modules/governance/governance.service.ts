import { getAlertStats } from "@/modules/alerts/alert.service"
import { countActionPlanOverview } from "@/modules/action-plans/action-plan.repository"
import { getClimateSurveyModuleDashboard } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { findClimateSurveyDispatchTimeline } from "@/modules/climate-surveys/climate-survey.repository"
import { getWorkforceDashboard } from "@/modules/workforce/workforce.service"
import type {
  GovernanceDashboard,
  GovernanceWaveStatus,
  GovernanceWaveTimelineItem,
} from "@/modules/governance/governance.types"

const TIMELINE_SIZE = 24

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

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
    countActionPlanOverview(tenantId),
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

  const latestEvolutionPoint = climate.evolution[climate.evolution.length - 1]

  return {
    climate: {
      waveConfigName: climate.wave?.configName ?? null,
      waveScheduledAt: climate.wave?.scheduledAt ?? null,
      adherencePercent: climate.kpis.adherencePercent,
      favorabilityPercent: climate.kpis.favorabilityPercent,
      scorePercent: latestEvolutionPoint?.overallScorePercent ?? null,
      enps: climate.kpis.enps,
      totalResponses: climate.kpis.totalResponses,
      totalRecipients: climate.kpis.totalRecipients,
      corporateGoalPercent: climate.corporateGoalPercent,
      evolution: climate.evolution.map((point) => ({
        dispatchId: point.dispatchId,
        label: point.label,
        scheduledAt: point.scheduledAt,
        adherencePercent: point.adherencePercent,
        favorabilityPercent: point.favorabilityPercent,
        enps: point.enps,
        overallScorePercent: point.overallScorePercent,
      })),
    },
    alerts: {
      total: alerts.total,
      unresolved: alerts.unresolved,
      criticalUnresolved: alerts.criticalUnresolved,
      resolved: alerts.resolved,
    },
    actionPlans: {
      total: actionPlans.total,
      open: actionPlans.open,
      inProgress: actionPlans.inProgress,
      completed: actionPlans.completed,
      overdue: actionPlans.overdue,
      completionRatePercent:
        actionPlans.total > 0 ? roundOneDecimal((actionPlans.completed / actionPlans.total) * 100) : null,
    },
    workforce: {
      competencia: workforce.selectedCompetencia,
      headcount: workforce.kpis.headcount,
      admissions: workforce.kpis.admissions,
      terminations: workforce.kpis.terminations,
      turnoverPercent: workforce.kpis.turnoverPercent,
      absenteeismPercent: workforce.kpis.absenteeismPercent,
      evolution: workforce.evolution.map((point) => ({
        competencia: point.competencia,
        headcount: point.headcount,
        turnoverPercent: point.turnoverPercent,
        absenteeismPercent: point.absenteeismPercent,
      })),
    },
    timeline,
  }
}
