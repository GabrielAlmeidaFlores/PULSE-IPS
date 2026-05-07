import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/modules/auth/session"
import { getPgrReviewById, getPgrScoreDistributions } from "@/modules/pgr/pgr.service"
import { generatePgrPdf } from "@/libs/integrations/pdf/pgr-pdf.adapter"
import type { PgrPdfInput, PgrPdfDept, PgrPdfDeptQuestion, PgrPdfAggregatedQuestion } from "@/libs/integrations/pdf/pgr-pdf.types"
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

  const distributions = await getPgrScoreDistributions(session.tenantId, review.period, allQuestions)

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

  const questionAggMap = new Map<string, { text: string; order: number; scoreDirection: string; totalWeighted: number; totalCount: number }>()
  for (const q of allQuestions) {
    if (!questionAggMap.has(q.questionId)) {
      questionAggMap.set(q.questionId, { text: q.questionText, order: q.questionOrder, scoreDirection: q.scoreDirection, totalWeighted: 0, totalCount: 0 })
    }
    const entry = questionAggMap.get(q.questionId)
    if (entry) {
      entry.totalWeighted += q.avgScore * q.responseCount
      entry.totalCount += q.responseCount
    }
  }

  const aggregatedQuestions: PgrPdfAggregatedQuestion[] = [...questionAggMap.values()]
    .map((v) => ({
      text: v.text,
      order: v.order,
      healthIndex: v.totalCount > 0 ? toHealthIndex(v.totalWeighted / v.totalCount) : 0,
      responseCount: v.totalCount,
      scoreDirection: v.scoreDirection,
    }))
    .sort((a, b) => a.healthIndex - b.healthIndex)

  const pdfDepts: PgrPdfDept[] = depts.map((dept) => {
    const hi = dept.avgScore > 0 ? toHealthIndex(dept.avgScore) : null
    const deptAdherence = dept.totalRecipients > 0
      ? Math.round((dept.responseCount / dept.totalRecipients) * 100)
      : 0

    const deptQuestionsRaw = allQuestions.filter((q) => q.departmentId === dept.departmentId)
    const deptQuestions: PgrPdfDeptQuestion[] = deptQuestionsRaw
      .map((q) => ({
        text: q.questionText,
        order: q.questionOrder,
        avgScore: q.avgScore,
        healthIndex: toHealthIndex(q.avgScore),
        responseCount: q.responseCount,
        scoreDirection: q.scoreDirection,
      }))
      .sort((a, b) => a.order - b.order)

    const scoredQs = deptQuestions.filter((q) => q.avgScore > 0)
    const healthyQs = scoredQs.filter((q) => q.healthIndex >= 62).length
    const warningQs = scoredQs.filter((q) => q.healthIndex >= 37 && q.healthIndex < 62).length
    const criticalQs = scoredQs.filter((q) => q.healthIndex < 37).length

    const sortedByScore = [...scoredQs].sort((a, b) => a.healthIndex - b.healthIndex)
    const worstQ = sortedByScore[0] ?? null
    const bestQ = sortedByScore[sortedByScore.length - 1] ?? null

    const deptDistributions = distributions
      .filter((d) => d.departmentId === dept.departmentId)
      .map((d) => ({
        questionId: d.questionId,
        questionOrder: d.questionOrder,
        distribution: d.distribution,
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
      healthyQs,
      warningQs,
      criticalQs,
      bestQuestion: bestQ ? { text: bestQ.text, order: bestQ.order, healthIndex: bestQ.healthIndex } : null,
      worstQuestion: worstQ ? { text: worstQ.text, order: worstQ.order, healthIndex: worstQ.healthIndex } : null,
      questionDistributions: deptDistributions,
    }
  })

  const input: PgrPdfInput = {
    orgName: org.name,
    period: review.period,
    periodLabel,
    generatedAt: review.createdAt,
    status: review.status,
    reviewedAt: review.reviewedAt ?? null,
    nextReviewAt: review.nextReviewAt ?? null,
    globalHealthIndex,
    totalEmployees,
    totalResponses,
    totalRecipients,
    adherencePct,
    healthyDepts,
    warningDepts,
    criticalDepts,
    departments: pdfDepts,
    aggregatedQuestions,
  }

  const buffer = await generatePgrPdf(input)
  const filename = `pgr-${review.period}.pdf`
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
