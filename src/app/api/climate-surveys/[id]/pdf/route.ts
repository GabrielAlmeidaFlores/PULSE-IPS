import { NextResponse, type NextRequest } from "next/server"
import { formatInTimeZone } from "date-fns-tz"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import {
  getClimateSurveyDispatchDashboard,
  getClimateSurveyDispatchHeatmap,
} from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT } from "@/modules/climate-surveys/climate-survey.types"
import { generateClimateSurveyPdf } from "@/libs/integrations/pdf/climate-survey-pdf.adapter"
import type { ClimateSurveyPdfInput } from "@/libs/integrations/pdf/climate-survey-pdf.types"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return new NextResponse("Não autorizado.", { status: 401 })

  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) {
    return new NextResponse("Recurso não disponível no plano.", { status: 403 })
  }

  const { id } = await params
  const [dashboard, heatmap, org] = await Promise.all([
    getClimateSurveyDispatchDashboard(session.tenantId, id),
    getClimateSurveyDispatchHeatmap(session.tenantId, id),
    getOrganization(session.tenantId),
  ])
  if (dashboard === null) return new NextResponse("Onda não encontrada.", { status: 404 })
  if (org === null) return new NextResponse("Organização não encontrada.", { status: 404 })

  const scheduledLabel = formatInTimeZone(dashboard.scheduledAt, org.timezone, "dd/MM/yyyy")
  const periodLabel =
    dashboard.dispatchedAt !== null
      ? `${scheduledLabel} – ${formatInTimeZone(dashboard.dispatchedAt, org.timezone, "dd/MM/yyyy")}`
      : scheduledLabel

  const topics = dashboard.dimensionScores.map((topic) => ({
    label: topic.label,
    favorabilityPercent: topic.favorabilityPercent,
  }))
  const topicsBelowGoal = topics.filter(
    (topic) => topic.favorabilityPercent !== null && topic.favorabilityPercent < CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
  ).length

  const input: ClimateSurveyPdfInput = {
    orgName: org.name,
    waveLabel: dashboard.configName,
    periodLabel,
    generatedAt: new Date(),
    goalPercent: CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT,
    kpis: {
      adherencePercent: Math.round(dashboard.adherenceRate * 100),
      favorabilityPercent: dashboard.favorabilityPercent,
      enps: dashboard.enps,
      topicsBelowGoal,
      totalTopics: topics.length,
      totalRecipients: dashboard.totalRecipients,
      totalResponses: dashboard.totalResponses,
    },
    topics,
    enps: dashboard.enpsBreakdown,
    departments: dashboard.departmentScores.map((department) => ({
      name: department.departmentName,
      favorabilityPercent: department.favorabilityPercent,
      enps: department.enps,
      respondentCount: department.respondentCount,
    })),
    heatmap:
      heatmap === null
        ? { topics: [], departments: [], rows: [] }
        : {
            topics: heatmap.topics.map((topic) => topic.label),
            departments: heatmap.departments.map((department) => department.name),
            rows: heatmap.topics.map((topic) => ({
              topic: topic.label,
              values: heatmap.departments.map(
                (department) =>
                  heatmap.cells.find(
                    (cell) => cell.dimension === topic.dimension && cell.departmentId === department.id,
                  )?.favorabilityPercent ?? null,
              ),
            })),
          },
  }

  const buffer = await generateClimateSurveyPdf(input)
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-clima-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
