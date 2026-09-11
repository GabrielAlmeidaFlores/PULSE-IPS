import {
  findClimateSurveyDispatchOrdinalRows,
  findClimateSurveyDispatchesPaginated,
} from "@/modules/climate-surveys/climate-survey.repository"
import { getClimateSurveyMultipleDispatchDashboards } from "@/modules/climate-surveys/climate-survey-dashboard.service"

export interface ClimateSurveyWaveReportRow {
  dispatchId: string
  configId: string
  waveNumber: number
  configName: string
  scheduledAt: Date
  dispatchedAt: Date | null
  status: string
  totalRecipients: number
  totalResponses: number
  adherencePercent: number
  favorabilityPercent: number | null
  enps: number | null
  departmentNames: string[]
}

export interface ClimateSurveyWaveReportsResult {
  items: ClimateSurveyWaveReportRow[]
  total: number
}

export interface ClimateSurveyWaveReportsQuery {
  page: number
  pageSize: number
}

export async function getClimateSurveyWaveReports(
  tenantId: string,
  query: ClimateSurveyWaveReportsQuery,
): Promise<ClimateSurveyWaveReportsResult> {
  const skip = (query.page - 1) * query.pageSize
  const take = query.pageSize

  const [listing, ordinalRows] = await Promise.all([
    findClimateSurveyDispatchesPaginated(tenantId, {}, skip, take),
    findClimateSurveyDispatchOrdinalRows(tenantId),
  ])

  const ordinalByDispatchId = new Map<string, number>()
  const counterByConfigId = new Map<string, number>()
  for (const row of ordinalRows) {
    const next = (counterByConfigId.get(row.climateSurveyConfigurationId) ?? 0) + 1
    counterByConfigId.set(row.climateSurveyConfigurationId, next)
    ordinalByDispatchId.set(row.id, next)
  }

  const dashboards = await getClimateSurveyMultipleDispatchDashboards(
    tenantId,
    listing.items.map((dispatch) => dispatch.id),
  )
  const dashboardById = new Map(dashboards.map((dashboard) => [dashboard.id, dashboard]))

  const items: ClimateSurveyWaveReportRow[] = listing.items.map((dispatch) => {
    const dashboard = dashboardById.get(dispatch.id)
    const totalRecipients = dashboard?.totalRecipients ?? 0
    const totalResponses = dashboard?.totalResponses ?? 0
    return {
      dispatchId: dispatch.id,
      configId: dispatch.climateSurveyConfigurationId,
      waveNumber: ordinalByDispatchId.get(dispatch.id) ?? 1,
      configName: dispatch.climateSurveyConfiguration.name,
      scheduledAt: dispatch.scheduledAt,
      dispatchedAt: dispatch.dispatchedAt,
      status: dispatch.status,
      totalRecipients,
      totalResponses,
      adherencePercent: totalRecipients > 0 ? Math.round((totalResponses / totalRecipients) * 100) : 0,
      favorabilityPercent: dashboard?.favorabilityPercent ?? null,
      enps: dashboard?.enps ?? null,
      departmentNames: dashboard?.departments.map((department) => department.name) ?? [],
    }
  })

  return { items, total: listing.total }
}
