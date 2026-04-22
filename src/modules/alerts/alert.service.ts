import { findAlertsByTenant, createAlert, markAlertRead, resolveAlert, findAllTenantsRecentSurveyResponsesForAlerts } from "@/modules/alerts/alert.repository"
import type { Alert, Department } from "@prisma/client"

export function getAlerts(tenantId: string): Promise<(Alert & { department: Department | null })[]> {
  return findAlertsByTenant(tenantId)
}

export function markRead(tenantId: string, alertId: string): Promise<{ count: number }> {
  return markAlertRead(tenantId, alertId)
}

export function resolve(tenantId: string, alertId: string): Promise<{ count: number }> {
  return resolveAlert(tenantId, alertId)
}

function normalizeItemScore(score: number, scoreDirection: string): number {
  return scoreDirection === "lower_is_better" ? 6 - score : score
}

export async function detectLowScoreAlerts(): Promise<void> {
  const LOW_SCORE_THRESHOLD = 3
  const LOOKBACK_HOURS = 48

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000)
  const responses = await findAllTenantsRecentSurveyResponsesForAlerts(since)

  const deptScores = new Map<string, { tenantId: string; departmentId: string; departmentName: string; scores: number[] }>()

  for (const response of responses) {
    const dept = response.dispatch.surveyConfiguration.department
    const key = `${response.tenantId}:${dept.id}`
    const existing = deptScores.get(key)
    const normalizedScores = response.items.map((item) => normalizeItemScore(item.score, item.question.scoreDirection))
    const avg = normalizedScores.reduce((sum, s) => sum + s, 0) / (normalizedScores.length || 1)
    if (existing) {
      existing.scores.push(avg)
    } else {
      deptScores.set(key, { tenantId: response.tenantId, departmentId: dept.id, departmentName: dept.name, scores: [avg] })
    }
  }

  for (const [, data] of Array.from(deptScores.entries())) {
    const avgScore = data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length
    if (avgScore < LOW_SCORE_THRESHOLD) {
      await createAlert({
        tenantId: data.tenantId,
        departmentId: data.departmentId,
        type: "low_score",
        severity: avgScore < 2 ? "critical" : "warning",
        message: `O índice de bem-estar ocupacional do setor ${data.departmentName} está abaixo do esperado: ${avgScore.toFixed(1)} de 5,0.`,
      })
    }
  }
}
