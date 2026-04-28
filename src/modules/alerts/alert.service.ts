import {
  findAlertsByTenant,
  createAlert,
  markAlertRead,
  resolveAlert,
  findAllTenantsRecentSurveyResponsesForAlerts,
  findAllTenantsResponsesInWindow,
  findAllTenantsActiveDepartments,
  findAllTenantsDeptRecentDispatchAvgs,
  findAllTenantsEmployeesWithExpiredConsentTokens,
  hasOpenAlertOfType,
  findAlertsByTenantPaginated,
  findAlertStatsByTenant,
  type AlertListingFilters,
  type AlertStats,
} from "@/modules/alerts/alert.repository"
import { toHealthIndex, healthIndexLabel } from "@/libs/utils/health-index"
import type { Alert, Department } from "@prisma/client"

export function getAlerts(tenantId: string): Promise<(Alert & { department: Department | null })[]> {
  return findAlertsByTenant(tenantId)
}

export interface AlertListingQuery {
  type?: string
  severity?: string
  status?: string
  page: number
  pageSize: number
}

export function getAlertsPaginated(
  tenantId: string,
  query: AlertListingQuery,
): Promise<{ alerts: (Alert & { department: Department | null })[]; total: number }> {
  const filters: AlertListingFilters = {}
  if (query.type !== undefined) filters.type = query.type
  if (query.severity !== undefined) filters.severity = query.severity
  if (query.status !== undefined) filters.status = query.status

  const skip = (query.page - 1) * query.pageSize
  return findAlertsByTenantPaginated(tenantId, filters, skip, query.pageSize)
}

export function getAlertStats(tenantId: string): Promise<AlertStats> {
  return findAlertStatsByTenant(tenantId)
}

export function markRead(tenantId: string, alertId: string): Promise<{ count: number }> {
  return markAlertRead(tenantId, alertId)
}

export function resolve(tenantId: string, alertId: string): Promise<{ count: number }> {
  return resolveAlert(tenantId, alertId)
}

export function normalizeItemScore(score: number, scoreDirection: string): number {
  return scoreDirection === "lower_is_better" ? 6 - score : score
}

export function calcAvgFromResponses(responses: { items: { score: number; question: { scoreDirection: string } }[] }[]): number {
  const allScores = responses.flatMap((r) =>
    r.items.map((item) => normalizeItemScore(item.score, item.question.scoreDirection)),
  )
  if (allScores.length === 0) return 0
  return allScores.reduce((a, b) => a + b, 0) / allScores.length
}

interface ResponseWithDept {
  tenantId: string
  items: { score: number; question: { scoreDirection: string } }[]
  dispatch: { surveyConfiguration: { department: { id: string; name: string } } }
}

function groupByDept(responses: ResponseWithDept[]): Map<string, { tenantId: string; departmentId: string; departmentName: string; responses: ResponseWithDept[] }> {
  const map = new Map<string, { tenantId: string; departmentId: string; departmentName: string; responses: ResponseWithDept[] }>()
  for (const r of responses) {
    const dept = r.dispatch.surveyConfiguration.department
    const key = `${r.tenantId}:${dept.id}`
    const existing = map.get(key)
    if (existing) {
      existing.responses.push(r)
    } else {
      map.set(key, { tenantId: r.tenantId, departmentId: dept.id, departmentName: dept.name, responses: [r] })
    }
  }
  return map
}

function buildLookbackWindows(): { currentFrom: Date; currentTo: Date; previousFrom: Date; previousTo: Date } {
  const now = Date.now()
  const hourMs = 60 * 60 * 1000
  return {
    currentFrom: new Date(now - 48 * hourMs),
    currentTo: new Date(now),
    previousFrom: new Date(now - 96 * hourMs),
    previousTo: new Date(now - 48 * hourMs),
  }
}

function dropSeverity(drop: number): "critical" | "warning" {
  return drop > 2 ? "critical" : "warning"
}

function averageOf(values: { avgScore: number }[]): number {
  return values.reduce((a, b) => a + b.avgScore, 0) / values.length
}

function isTrendNegative(lastN: { avgScore: number }[], historical: { avgScore: number }[]): boolean {
  if (historical.length === 0) return false
  const historicalAvg = averageOf(historical)
  return lastN.every((p) => p.avgScore < historicalAvg)
}

function groupEmployeesByDept(
  employees: { tenantId: string; departmentId: string; departmentName: string }[],
): Map<string, { tenantId: string; departmentId: string; departmentName: string; count: number }> {
  const grouped = new Map<string, { tenantId: string; departmentId: string; departmentName: string; count: number }>()
  for (const emp of employees) {
    const key = `${emp.tenantId}:${emp.departmentId}`
    const existing = grouped.get(key)
    if (existing) {
      existing.count += 1
    } else {
      grouped.set(key, { ...emp, count: 1 })
    }
  }
  return grouped
}

export async function detectLowScoreAlerts(): Promise<void> {
  const LOW_SCORE_THRESHOLD = 3
  const LOOKBACK_HOURS = 48

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000)
  const responses = await findAllTenantsRecentSurveyResponsesForAlerts(since)
  const byDept = groupByDept(responses)

  for (const [, data] of Array.from(byDept.entries())) {
    const avgScore = calcAvgFromResponses(data.responses)
    if (avgScore >= LOW_SCORE_THRESHOLD) continue

    const alreadyOpen = await hasOpenAlertOfType(data.tenantId, "low_score", data.departmentId)
    if (alreadyOpen) continue

    const hi = toHealthIndex(avgScore)
    await createAlert({
      tenantId: data.tenantId,
      departmentId: data.departmentId,
      type: "low_score",
      severity: avgScore < 2 ? "critical" : "warning",
      message: `O índice de saúde do setor ${data.departmentName} está abaixo do esperado: ${hi}% (${healthIndexLabel(hi)}).`,
    })
  }
}

export async function detectScoreDropAlerts(): Promise<void> {
  const SCORE_DROP_THRESHOLD = 1.0
  const { currentFrom, currentTo, previousFrom, previousTo } = buildLookbackWindows()

  const [currentResponses, previousResponses] = await Promise.all([
    findAllTenantsResponsesInWindow(currentFrom, currentTo),
    findAllTenantsResponsesInWindow(previousFrom, previousTo),
  ])

  const currentByDept = groupByDept(currentResponses)
  const previousByDept = groupByDept(previousResponses)

  for (const [key, current] of Array.from(currentByDept.entries())) {
    const previous = previousByDept.get(key)
    if (!previous) continue

    const currentAvg = calcAvgFromResponses(current.responses)
    const previousAvg = calcAvgFromResponses(previous.responses)
    const drop = previousAvg - currentAvg
    if (drop <= SCORE_DROP_THRESHOLD) continue

    const alreadyOpen = await hasOpenAlertOfType(current.tenantId, "score_drop", current.departmentId ?? undefined)
    if (alreadyOpen) continue

    const currentHi = toHealthIndex(currentAvg)
    const previousHi = toHealthIndex(previousAvg)
    await createAlert({
      tenantId: current.tenantId,
      departmentId: current.departmentId,
      type: "score_drop",
      severity: dropSeverity(drop),
      message: `Queda de ${drop.toFixed(1)} pontos no índice de saúde do setor ${current.departmentName}: de ${previousHi}% para ${currentHi}% nas últimas 48h.`,
    })
  }
}

export async function detectNegativeTrendAlerts(): Promise<void> {
  const PERIODS_TO_CHECK = 3
  const departments = await findAllTenantsActiveDepartments()

  for (const dept of departments) {
    const recent = await findAllTenantsDeptRecentDispatchAvgs(dept.id, PERIODS_TO_CHECK + 6)
    if (recent.length < PERIODS_TO_CHECK) continue

    const lastThree = recent.slice(0, PERIODS_TO_CHECK)
    const historical = recent.slice(PERIODS_TO_CHECK)

    if (!isTrendNegative(lastThree, historical)) continue

    const alreadyOpen = await hasOpenAlertOfType(dept.tenantId, "negative_trend", dept.id)
    if (alreadyOpen) continue

    const latestHi = toHealthIndex(lastThree[0]?.avgScore ?? 0)
    await createAlert({
      tenantId: dept.tenantId,
      departmentId: dept.id,
      type: "negative_trend",
      severity: "warning",
      message: `O setor ${dept.name} apresenta tendência negativa por ${PERIODS_TO_CHECK} períodos consecutivos abaixo da média histórica. Índice atual: ${latestHi}%.`,
    })
  }
}

export async function detectConsentExpiredAlerts(): Promise<void> {
  const expiredByDept = await findAllTenantsEmployeesWithExpiredConsentTokens()
  const grouped = groupEmployeesByDept(expiredByDept)

  for (const [, data] of Array.from(grouped.entries())) {
    const alreadyOpen = await hasOpenAlertOfType(data.tenantId, "consent_expired", data.departmentId)
    if (alreadyOpen) continue

    await createAlert({
      tenantId: data.tenantId,
      departmentId: data.departmentId,
      type: "consent_expired",
      severity: "warning",
      message: `${data.count} colaborador(es) do setor ${data.departmentName} com convite de consentimento expirado. Reenvie o convite para retomar a participação.`,
    })
  }
}

