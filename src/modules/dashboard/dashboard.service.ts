import { format, subMonths, subDays, startOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { MINIMUM_RESPONDENTS_FOR_DISPLAY } from "@/libs/utils/anonymity"
import {
  findDispatchesWithData,
  findDeptDispatchesWithData,
  findDeptActiveAlerts,
  findUniqueQuestions,
  countActiveEmployees,
  countTotalResponses,
  countActiveAlerts,
  findActiveDepartments,
  findOrganizationTimezone,
  type DispatchWithData,
  type UniqueQuestion,
  type DeptActiveAlert,
} from "@/modules/dashboard/dashboard.repository"
import { toHealthIndex } from "@/libs/utils/health-index"

export type { UniqueQuestion, DeptActiveAlert }

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
  hasData: boolean
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

function monthLabel(date: Date, timezone: string): string {
  const zonedDate = toZonedTime(date, timezone)
  return format(startOfMonth(zonedDate), "MMMM 'de' yyyy", { locale: ptBR })
}

interface MonthAgg {
  totalScore: number
  scoreCount: number
  responseCount: number
  monthDate: Date
  monthKey: string
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
  recentResponseCount: number
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
  timezone: string,
): DispatchProcessResult {
  const filterActive = selectedOrders.length > 0
  const orderSet = new Set(selectedOrders)

  const overallByMonth = new Map<string, MonthAgg>()
  const deptInfo = new Map<string, DeptInfo>()
  const recentScores: number[] = []
  let recentResponseCount = 0

  for (const dispatch of dispatches) {
    if (!dispatch.dispatchedAt) continue

    const dept = dispatch.healthSurveyConfiguration.department.name
    const deptId = dispatch.healthSurveyConfiguration.department.id
    const key = monthLabel(dispatch.dispatchedAt, timezone)
    const monthDate = startOfMonth(toZonedTime(dispatch.dispatchedAt, timezone))
    const isRecent = dispatch.dispatchedAt >= thirtyDaysAgo

    const info = deptInfo.get(dept) ?? { deptId, monthMap: new Map<string, DeptMonthAgg>(), adherenceResponses: 0, adherenceRecipients: 0 }
    info.adherenceResponses += dispatch.responses.length
    info.adherenceRecipients += dispatch.totalRecipients
    deptInfo.set(dept, info)

    const overall = overallByMonth.get(key) ?? { totalScore: 0, scoreCount: 0, responseCount: 0, monthDate, monthKey: key }
    overall.responseCount += dispatch.responses.length

    for (const response of dispatch.responses) {
      if (isRecent) recentResponseCount++
      processResponseItems(response, { filterActive, orderSet, overall, info, key, monthDate, isRecent, recentScores })
    }

    overallByMonth.set(key, overall)
  }

  return { overallByMonth, deptInfo, recentScores, recentResponseCount }
}

export function getAvailableQuestions(tenantId: string): Promise<UniqueQuestion[]> {
  return findUniqueQuestions(tenantId)
}

export async function getDashboardData(tenantId: string, selectedOrders: number[] = []): Promise<DashboardData> {
  const sixMonthsAgo = subMonths(new Date(), 6)
  const thirtyDaysAgo = subDays(new Date(), 30)

  const [dispatches, totalEmployees, totalResponses, activeAlerts, activeDepts, timezone] = await Promise.all([
    findDispatchesWithData(tenantId, sixMonthsAgo),
    countActiveEmployees(tenantId),
    countTotalResponses(tenantId),
    countActiveAlerts(tenantId),
    findActiveDepartments(tenantId),
    findOrganizationTimezone(tenantId),
  ])

  const { overallByMonth, deptInfo, recentScores, recentResponseCount } = processDispatches(dispatches, thirtyDaysAgo, selectedOrders, timezone)

  const activeDeptIds = new Set(activeDepts.map((d) => d.id))

  for (const [name, info] of deptInfo.entries()) {
    if (!activeDeptIds.has(info.deptId)) {
      deptInfo.delete(name)
    }
  }

  for (const dept of activeDepts) {
    const alreadyPresent = [...deptInfo.values()].some((info) => info.deptId === dept.id)
    if (!alreadyPresent) {
      deptInfo.set(dept.name, { deptId: dept.id, monthMap: new Map(), adherenceResponses: 0, adherenceRecipients: 0 })
    }
  }

  const rawAvg =
    recentResponseCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY && recentScores.length > 0
      ? roundTwo(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
      : null

  const healthIndex = rawAvg !== null ? toHealthIndex(rawAvg) : null

  const kpis = { totalEmployees, totalResponses, activeAlerts, healthIndex }

  const sortedMonths = [...overallByMonth.values()].sort(
    (a, b) => a.monthDate.getTime() - b.monthDate.getTime(),
  )

  const overallTrend: TrendPoint[] = sortedMonths.map((m) => ({
    month: m.monthKey,
    avg: m.responseCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY && m.scoreCount > 0 ? toHealthIndex(roundTwo(m.totalScore / m.scoreCount)) : 0,
    responses: m.responseCount,
  }))

  const deptNames = [...deptInfo.keys()].sort()

  const deptMonthlyChart: ChartMonthPoint[] = sortedMonths.map(({ monthKey }) => {
    const point: ChartMonthPoint = { month: monthKey }
    for (const dept of deptNames) {
      const data = deptInfo.get(dept)?.monthMap.get(monthKey)
      if (data && data.responseCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY && data.scoreCount > 0) {
        point[dept] = toHealthIndex(roundTwo(data.totalScore / data.scoreCount))
      }
    }
    return point
  })

  const lastMonth = sortedMonths[sortedMonths.length - 1]
  const latestMonthKey = lastMonth ? lastMonth.monthKey : null

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
        hasData: info.monthMap.size > 0,
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

export interface DeptQuestionScore {
  questionText: string
  healthIndex: number
  rawAvg: number
  itemCount: number
}

export interface DeptHealthSummary {
  questionScores: DeptQuestionScore[]
  activeAlerts: DeptActiveAlert[]
  adherenceRate: number | null
  responseCount: number
  totalRecipients: number
}

function aggregateDeptQuestionScores(dispatches: DispatchWithData[]): DeptQuestionScore[] {
  const questionMap = new Map<string, { totalNormalized: number; itemCount: number }>()

  for (const dispatch of dispatches) {
    for (const response of dispatch.responses) {
      for (const item of response.items) {
        const normalized = normalizeScore(item.score, item.question.scoreDirection)
        const existing = questionMap.get(item.question.text) ?? { totalNormalized: 0, itemCount: 0 }
        existing.totalNormalized += normalized
        existing.itemCount++
        questionMap.set(item.question.text, existing)
      }
    }
  }

  return [...questionMap.entries()]
    .filter(([, data]) => data.itemCount >= MINIMUM_RESPONDENTS_FOR_DISPLAY)
    .map(([text, data]) => {
      const rawAvg = roundTwo(data.totalNormalized / data.itemCount)
      return {
        questionText: text,
        healthIndex: toHealthIndex(rawAvg),
        rawAvg,
        itemCount: data.itemCount,
      }
    })
    .sort((a, b) => a.rawAvg - b.rawAvg)
}

export async function getDeptHealthSummary(tenantId: string, deptId: string): Promise<DeptHealthSummary> {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const [dispatches, activeAlerts] = await Promise.all([
    findDeptDispatchesWithData(tenantId, deptId, thirtyDaysAgo),
    findDeptActiveAlerts(tenantId, deptId),
  ])

  const questionScores = aggregateDeptQuestionScores(dispatches)

  const totalRecipients = dispatches.reduce((sum, d) => sum + d.totalRecipients, 0)
  const responseCount = dispatches.reduce((sum, d) => sum + d.responses.length, 0)
  const adherenceRate =
    totalRecipients > 0 ? Math.round((responseCount / totalRecipients) * 1000) / 10 : null

  return {
    questionScores,
    activeAlerts,
    adherenceRate,
    responseCount,
    totalRecipients,
  }
}
