import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/modules/auth/session"
import { getPgrReviewById } from "@/modules/pgr/pgr.service"
import { generatePgrPdf } from "@/libs/integrations/pdf/pgr-pdf.adapter"
import type { PgrPdfInput, PgrPdfDept } from "@/libs/integrations/pdf/pgr-pdf.types"
import { getOrganization } from "@/modules/organizations/organization.service"
import { toHealthIndex } from "@/libs/utils/health-index"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return new NextResponse("Não autorizado.", { status: 401 })

  const { id } = await params
  const review = await getPgrReviewById(session.tenantId, id)
  if (!review) return new NextResponse("Relatório não encontrado.", { status: 404 })

  const org = await getOrganization(session.tenantId)
  if (!org) return new NextResponse("Organização não encontrada.", { status: 404 })

  const [year, month] = review.period.split("-")
  const periodLabel = format(
    new Date(Number(year), Number(month) - 1, 1),
    "MMMM 'de' yyyy",
    { locale: ptBR },
  )

  const depts = review.deptResults
  const allQuestions = review.questionResults

  const totalResponses = depts.reduce((s, d) => s + d.responseCount, 0)
  const totalRecipients = depts.reduce((s, d) => s + d.totalRecipients, 0)
  const totalEmployees = depts.reduce((s, d) => s + d.employeeCount, 0)
  const adherencePct = totalRecipients > 0 ? Math.round((totalResponses / totalRecipients) * 100) : 0

  const scoredDepts = depts.filter((d) => d.avgScore > 0)
  const globalAvgRaw =
    scoredDepts.length > 0
      ? scoredDepts.reduce((s, d) => s + d.avgScore, 0) / scoredDepts.length
      : 0
  const globalHealthIndex = scoredDepts.length > 0 ? toHealthIndex(globalAvgRaw) : null

  const healthyDepts = scoredDepts.filter((d) => toHealthIndex(d.avgScore) >= 62).length
  const warningDepts = scoredDepts.filter((d) => { const hi = toHealthIndex(d.avgScore); return hi >= 37 && hi < 62 }).length
  const criticalDepts = scoredDepts.filter((d) => toHealthIndex(d.avgScore) < 37).length

  const pdfDepts: PgrPdfDept[] = depts.map((dept) => {
    const hi = dept.avgScore > 0 ? toHealthIndex(dept.avgScore) : null
    const deptAdherence = dept.totalRecipients > 0
      ? Math.round((dept.responseCount / dept.totalRecipients) * 100)
      : 0
    const deptQuestions = allQuestions
      .filter((q) => q.departmentId === dept.departmentId)
      .map((q) => ({
        text: q.questionText,
        order: q.questionOrder,
        avgScore: q.avgScore,
        responseCount: q.responseCount,
        scoreDirection: q.scoreDirection,
      }))
    return {
      name: dept.departmentName,
      healthIndex: hi,
      avgScore: dept.avgScore,
      responseCount: dept.responseCount,
      totalRecipients: dept.totalRecipients,
      adherencePct: deptAdherence,
      employeeCount: dept.employeeCount,
      questions: deptQuestions,
    }
  })

  const input: PgrPdfInput = {
    orgName: org.name,
    period: review.period,
    periodLabel,
    generatedAt: review.createdAt,
    status: review.status,
    reviewedAt: review.reviewedAt ?? null,
    globalHealthIndex,
    totalEmployees,
    totalResponses,
    totalRecipients,
    adherencePct,
    healthyDepts,
    warningDepts,
    criticalDepts,
    departments: pdfDepts,
  }

  const buffer = await generatePgrPdf(input)
  const filename = `pgr-${review.period}-${org.name.toLowerCase().replace(/\s+/g, "-")}.pdf`
  const body = new Uint8Array(buffer)

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
