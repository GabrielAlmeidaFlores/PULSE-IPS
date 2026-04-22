import { format, subMonths, subDays, startOfMonth } from "date-fns"
import { MINIMUM_RESPONDENTS_FOR_DISPLAY } from "@/libs/utils/anonymity"
import {
  findDispatchesWithData,
  findUniqueQuestions,
  countActiveEmployees,
  countTotalResponses,
  countActiveAlerts,
  type DispatchWithData,
  type UniqueQuestion,
} from "@/modules/dashboard/dashboard.repository"
import { toHealthIndex } from "@/libs/utils/health-index"

export type { UniqueQuestion }

export interface ChartMonthPoint {
  month: string
  [dept: string]: number | string
}

export interface BarPoint {
  dept: string
  avg?: number
  adherence?: number
}

export interface DeptCard {
  dept: string
  deptId: string
  avg: number
  prevAvg: number | null
  trend: "up" | "down" | "stable"
  trendDelta: number
}

export interface TrendPoint {
  month: string
  avg: number
  responses: number
}

export interface DashboardKpis {
  totalEmployees: number
  totalResponses: number
  activeAlerts: number
  healthIndex: number | null
}

export interface DashboardData {
  kpis: DashboardKpis
  overallTrend: TrendPoint[]
  deptMonthlyChart: ChartMonthPoint[]
  deptNames: string[]
  deptComparison: BarPoint[]
  adherenceChart: BarPoint[]
  deptCards: DeptCard[]
}

function roundTwo(n: number): number {
  return Math.round(n * 100) / 100
}

function normalizeScore(score: number, scoreDirection: string): number {
  return scoreDirection === "lower_is_better" ? 6 - score : score
}

function monthLabel(date: Date): string {
  return format(startOfMonth(date), "MMM/yy")
}

interface MonthAgg {
  totalScore: number
  scoreCount: number
  responseCount: number
  monthDate: Date
}

interface DeptMonthAgg {
  totalScore: number
  scoreCount: number
  responseCount: number
  monthDate: Date
}

interface DeptInfo {
  deptId: string
  monthMap: Map<string, DeptMonthAgg>
  adherenceResponses: number
  adherenceRecipients: number
}

interface DispatchProcessResult {
  overallByMonth: Map<string, MonthAgg>
  deptInfo: Map<string, DeptInfo>
  recentScores: number[]
}

interface ItemProcessParams {
  filterActive: boolean
  orderSet: Set<number>
  overall: MonthAgg
  info: DeptInfo
  key: string
  monthDate: Date
  isRecent: boolean
  recentScores: number[]
}

function processResponseItems(response: DispatchWithData["responses"][number], params: ItemProcessParams): void {
  let responseCountedForDept = false
  for (const item of response.items) {
    if (params.filterActive && !params.orderSet.has(item.question.order)) continue
    const normalizedScore = normalizeScore(item.score, item.question.scoreDirection)
    params.overall.totalScore += normalizedScore
    params.overall.scoreCount++
    const deptMonthData = params.info.monthMap.get(params.key) ?? { totalScore: 0, scoreCount: 0, responseCount: 0, monthDate: params.monthDate }
    deptMonthData.totalScore += normalizedScore
    deptMonthData.scoreCount++
    if (!responseCountedForDept) {
      deptMonthData.responseCount++
      responseCountedForDept = true
    }
    params.info.monthMap.set(params.key, deptMonthData)
    if (params.isRecent) params.recentScores.push(normalizedScore)
  }
}

function processDispatches(
  dispatches: DispatchWithData[],
  thirtyDaysAgo: Date,
  selectedOrders: number[],
): DispatchProcessResult {
  const filterActive = selectedOrders.length > 0
  const orderSet = new Set(selectedOrders)

  const overallByMonth = new Map<string, MonthAgg>()
  const deptInfo = new Map<string, DeptInfo>()
  const recentScores: number[] = []

  for (const dispatch of dispatches) {
    if (!dispatch.dispatchedAt) continue

    const dept = dispatch.surveyConfiguration.department.name
    const deptId = dispatch.surveyConfiguration.department.id
    const key = monthLabel(dispatch.dispatchedAt)
    const monthDate = startOfMonth(dispatch.dispatchedAt)
    const isRecent = dispatch.dispatchedAt >= thirtyDaysAgo

    const info = deptInfo.get(dept) ?? { deptId, monthMap: new Map<string, DeptMonthAgg>(), adherenceResponses: 0, adherenceRecipients: 0 }
    info.adherenceResponses += dispatch.responses.length
    info.adherenceRecipients += dispatch.totalRecipients
    deptInfo.set(dept, info)

    const overall = overallByMonth.get(key) ?? { totalScore: 0, scoreCount: 0, responseCount: 0, monthDate }
    overall.responseCount += dispatch.responses.length

    for (const response of dispatch.responses) {
      processResponseItems(response, { filterActive, orderSet, overall, info, key, monthDate, isRecent, recentScores })
    }

    overallByMonth.set(key, overall)
  }

  return { overallByMonth, deptInfo, recentScores }
}

export function getAvailableQuestions(tenantId: string): Promise<UniqueQuestion[]> {
  return findUniqueQuestions(tenantId)
}

export async function getDashboardData(tenantId: string, selectedOrders: number[] = []): Promise<DashboardData> {
  const sixMonthsAgo = subMonths(new Date(), 6)
  const thirtyDaysAgo = subDays(new Date(), 30)

  const [dispatches, totalEmployees, totalResponses, activeAlerts] = await Promise.all([
    findDispatchesWithData(tenantId, sixMonthsAgo),
    countActiveEmployees(tenantId),
    countTotalResponses(tenantId),
    countActiveAlerts(tenantId),
  ])

  const { overallByMonth, deptInfo, recentScores } = processDispatches(dispatches, thirtyDaysAgo, selectedOrders)

  const rawAvg =
    recentScores.length > 0
      ? roundTwo(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
      : null

  const healthIndex = rawAvg !== null ? toHealthIndex(rawAvg) : null

  const kpis = { totalEmployees, totalResponses, activeAlerts, healthIndex }

  const sortedMonths = [...overallByMonth.values()].sort(
    (a, b) => a.monthDate.getTime() - b.monthDate.getTime(),
  )

  const overallTrend: TrendPoint[] = sortedMonths.map((m) => ({
    month: monthLabel(m.monthDate),
    avg: m.scoreCount > 0 ? toHealthIndex(roundTwo(m.totalScore / m.scoreCount)) : 0,
    responses: m.responseCount,
  }))

  const deptNames = [...deptInfo.keys()].sort()

  const deptMonthlyChart: ChartMonthPoint[] = sortedMonths.map(({ monthDate }) => {
    const key = monthLabel(monthDate)
    const point: ChartMonthPoint = { month: key }
    for (const dept of deptNames) {
      const data = deptInfo.get(dept)?.monthMap.get(key)
      if (data && data.responseCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY && data.scoreCount > 0) {
        point[dept] = toHealthIndex(roundTwo(data.totalScore / data.scoreCount))
      }
    }
    return point
  })

  const lastMonth = sortedMonths[sortedMonths.length - 1]
  const latestMonthKey = lastMonth ? monthLabel(lastMonth.monthDate) : null

  const deptComparison: BarPoint[] = latestMonthKey
    ? [...deptInfo.entries()]
        .map(([dept, info]) => {
          const data = info.monthMap.get(latestMonthKey)
          const hasEnoughRespondents = data !== undefined && data.responseCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY
          return {
            dept,
            avg: hasEnoughRespondents && data.scoreCount > 0 ? toHealthIndex(roundTwo(data.totalScore / data.scoreCount)) : 0,
          }
        })
        .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
    : []

  const adherenceChart: BarPoint[] = [...deptInfo.entries()]
    .map(([dept, info]) => ({
      dept,
      adherence:
        info.adherenceRecipients > 0
          ? Math.round((info.adherenceResponses / info.adherenceRecipients) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => (b.adherence ?? 0) - (a.adherence ?? 0))

  const deptCards: DeptCard[] = [...deptInfo.entries()]
    .map(([dept, info]) => {
      const sortedEntries = [...info.monthMap.entries()].sort(
        (a, b) => b[1].monthDate.getTime() - a[1].monthDate.getTime(),
      )
      const latestEntry = sortedEntries[0]
      const prevEntry = sortedEntries[1]

      const latestHasEnough = latestEntry !== undefined && latestEntry[1].responseCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY
      const prevHasEnough = prevEntry !== undefined && prevEntry[1].responseCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY

      const avg =
        latestHasEnough && latestEntry[1].scoreCount > 0
          ? toHealthIndex(roundTwo(latestEntry[1].totalScore / latestEntry[1].scoreCount))
          : 0
      const prevAvg =
        prevHasEnough && prevEntry[1].scoreCount > 0
          ? toHealthIndex(roundTwo(prevEntry[1].totalScore / prevEntry[1].scoreCount))
          : null

      let trend: DeptCard["trend"] = "stable"
      if (prevAvg !== null) {
        if (avg > prevAvg) trend = "up"
        else if (avg < prevAvg) trend = "down"
      }

      return {
        dept,
        deptId: info.deptId,
        avg,
        prevAvg,
        trend,
        trendDelta: prevAvg !== null ? roundTwo(avg - prevAvg) : 0,
      }
    })
    .sort((a, b) => b.avg - a.avg)

  return {
    kpis,
    overallTrend,
    deptMonthlyChart,
    deptNames,
    deptComparison,
    adherenceChart,
    deptCards,
  }
}
