import { prisma } from "@/libs/db"

export interface ActionPlanSuggestion {
  key: string
  title: string
  description: string
  priority: "low" | "medium" | "high"
  reason: string
  tasks: string[]
}

interface AlertWithContext {
  id: string
  type: string
  severity: string
  departmentId: string | null
  department: { name: string } | null
  message: string
  createdAt: Date
}

interface LowAdherenceDispatch {
  id: string
  totalRecipients: number
  totalResponses: number
  dispatchedAt: Date | null
  surveyConfiguration: { department: { name: string } | null } | null
}

interface ReportItem {
  category: string | null
  status: string
  createdAt: Date
}

interface ConsentDeptGroup {
  departmentId: string
  _count: { departmentId: number }
}

const ALERT_TASKS: Record<string, string[]> = {
  crisis_report: [
    "Acionar canal de suporte psicológico disponível",
    "Comunicar equipe sobre recursos de apoio (CVV: 188)",
    "Revisar protocolo de crise com o RH",
    "Acompanhar evolução do clima no setor nas próximas semanas",
  ],
  score_drop: [
    "Reunião de diagnóstico com liderança do setor",
    "Levantamento dos principais fatores de risco relatados",
    "Definir medidas corretivas e responsáveis",
    "Monitorar evolução nas próximas pesquisas",
  ],
  low_score: [
    "Reunião de diagnóstico com liderança do setor",
    "Levantamento dos principais fatores de risco relatados",
    "Definir medidas corretivas e responsáveis",
    "Monitorar evolução nas próximas pesquisas",
  ],
  negative_trend: [
    "Análise detalhada das respostas dos últimos períodos",
    "Reunião com liderança para identificar causas raiz",
    "Definir metas de melhoria e prazo de reavaliação",
    "Revisão do processo de trabalho no setor",
  ],
  low_adherence: [
    "Comunicado interno sobre a importância das pesquisas",
    "Alinhamento com gestores e lideranças do setor",
    "Revisar horário e frequência de envio das pesquisas",
    "Identificar e remover barreiras à participação",
  ],
  no_response: [
    "Verificar se os links de pesquisa chegaram corretamente",
    "Comunicado interno reforçando a importância das pesquisas",
    "Alinhar com gestores a divulgação interna do programa",
    "Revisar janela de horário configurada para o setor",
  ],
}

const ALERT_PRIORITY: Record<string, "low" | "medium" | "high"> = {
  crisis_report: "high",
  score_drop: "high",
  low_score: "high",
  negative_trend: "high",
  low_adherence: "medium",
  no_response: "medium",
}

const ALERT_TITLE_BY_TYPE: Record<string, string> = {
  crisis_report: "Resposta a relato de crise",
  score_drop: "Intervenção de bem-estar",
  low_score: "Índice de bem-estar abaixo do esperado",
  negative_trend: "Plano de melhoria contínua",
  low_adherence: "Engajamento nas pesquisas",
  no_response: "Pesquisa sem respostas registradas",
}

const ALERT_CONTEXT_BY_TYPE: Record<string, string> = {
  crisis_report:
    "O sistema identificou palavras-chave de crise em um relato anônimo. Enquanto o alerta permanecer aberto, o risco à saúde mental do time é considerado crítico. Ação imediata é necessária.",
  score_drop:
    "Quedas de score costumam indicar aumento de pressão, sobrecarga ou conflitos não endereçados. Agir rapidamente reduz o risco de agravamento e demonstra comprometimento com a NR-1.",
  low_score:
    "Scores persistentemente baixos estão associados a burnout, queda de produtividade e aumento de turnover. É necessário investigar as causas e implementar ações estruturadas.",
  negative_trend:
    "Tendências negativas prolongadas aumentam o risco de burnout e comprometem o cumprimento da NR-1. O problema se agrava a cada ciclo sem intervenção.",
  low_adherence:
    "Baixa participação compromete a representatividade dos dados e pode mascarar problemas reais de saúde no time. Dados insuficientes impedem a detecção precoce de riscos.",
  no_response:
    "Sem respostas, não é possível monitorar o bem-estar do setor. A ausência de dados compromete tanto a gestão interna quanto a documentação de conformidade com a NR-1.",
}

const SEVERITY_LABEL_BY_VALUE: Record<string, string> = {
  critical: "crítica",
  warning: "atenção",
  info: "informativa",
}

const REPORT_CATEGORY_LABEL_BY_VALUE: Record<string, string> = {
  harassment: "assédio",
  overload: "sobrecarga",
  conflict: "conflito",
  physical_environment: "ambiente físico",
  other: "outros",
}

const SUPPORTED_ALERT_TYPES = new Set(Object.keys(ALERT_TASKS))

const ALERT_TYPE_ORDER = ["crisis_report", "score_drop", "low_score", "negative_trend", "low_adherence", "no_response"]

function formatDateAsBrazilian(date: Date): string {
  return date.toLocaleDateString("pt-BR")
}

function daysSinceDate(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDaysAgoLabel(date: Date): string {
  const days = daysSinceDate(date)
  if (days === 0) return "hoje"
  if (days === 1) return "há 1 dia"
  return `há ${days} dias`
}

function buildAlertDescription(alert: AlertWithContext): string {
  const deptName = alert.department?.name ?? "geral"
  const severityLabel = SEVERITY_LABEL_BY_VALUE[alert.severity] ?? alert.severity
  const daysAgoLabel = formatDaysAgoLabel(alert.createdAt)
  const typeContext = ALERT_CONTEXT_BY_TYPE[alert.type] ?? ""

  return `Alerta gerado em ${formatDateAsBrazilian(alert.createdAt)} (${daysAgoLabel}) — setor: ${deptName}, severidade: ${severityLabel}. Dado registrado pelo sistema: "${alert.message}". ${typeContext}`.trim()
}

function buildSuggestionFromAlert(alert: AlertWithContext): ActionPlanSuggestion | null {
  if (!SUPPORTED_ALERT_TYPES.has(alert.type)) return null
  const deptName = alert.department?.name ?? "geral"
  const titleBase = ALERT_TITLE_BY_TYPE[alert.type] ?? "Ação necessária"
  const daysAgoLabel = formatDaysAgoLabel(alert.createdAt)

  const reasonByType: Record<string, string> = {
    crisis_report: `Alerta de crise ativo no setor ${deptName} (${daysAgoLabel})`,
    score_drop: `Queda de score no setor ${deptName} — alerta ativo ${daysAgoLabel}`,
    low_score: `Score abaixo do esperado — setor ${deptName}: ${alert.message}`,
    negative_trend: `Tendência negativa no setor ${deptName} — ativo ${daysAgoLabel}`,
    low_adherence: `Baixa adesão no setor ${deptName}: ${alert.message}`,
    no_response: `Pesquisa sem resposta no setor ${deptName}: ${alert.message}`,
  }

  return {
    key: `alert-${alert.type}-${alert.departmentId ?? "global"}`,
    title: `${titleBase} — ${deptName}`,
    description: buildAlertDescription(alert),
    priority: ALERT_PRIORITY[alert.type] ?? "medium",
    reason: reasonByType[alert.type] ?? `Alerta ${alert.type} no setor ${deptName}`,
    tasks: ALERT_TASKS[alert.type] ?? [],
  }
}

function pickAlertSuggestions(
  openAlerts: AlertWithContext[],
  existingTitles: Set<string>,
  seenKeys: Set<string>,
  slots: number,
): ActionPlanSuggestion[] {
  const result: ActionPlanSuggestion[] = []
  for (const alertType of ALERT_TYPE_ORDER) {
    if (result.length >= slots) break
    const topAlert = openAlerts.find((a) => a.type === alertType)
    if (!topAlert) continue
    const suggestion = buildSuggestionFromAlert(topAlert)
    if (!suggestion || seenKeys.has(suggestion.key) || existingTitles.has(suggestion.title.toLowerCase())) continue
    seenKeys.add(suggestion.key)
    result.push(suggestion)
  }
  return result
}

function buildReportSuggestion(
  openReports: ReportItem[],
  existingTitles: Set<string>,
): ActionPlanSuggestion | null {
  if (openReports.length < 3) return null
  const title = "Tratamento de relatos anônimos pendentes"
  if (existingTitles.has(title.toLowerCase())) return null

  const openCount = openReports.filter((r) => r.status === "open").length
  const analyzingCount = openReports.filter((r) => r.status === "analyzing").length

  const oldestReport = openReports[0]
  const oldestDaysAgoLabel = oldestReport !== undefined ? formatDaysAgoLabel(oldestReport.createdAt) : "data desconhecida"

  const categoryCountMap = new Map<string, number>()
  for (const report of openReports) {
    const categoryKey = report.category ?? "other"
    categoryCountMap.set(categoryKey, (categoryCountMap.get(categoryKey) ?? 0) + 1)
  }
  const topCategoriesFormatted = [...categoryCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => `${REPORT_CATEGORY_LABEL_BY_VALUE[cat] ?? cat} (${count})`)
    .join(", ")

  const statusBreakdownParts = [
    openCount > 0 && `${openCount} sem triagem`,
    analyzingCount > 0 && `${analyzingCount} em análise`,
  ].filter(Boolean)
  const statusBreakdownLabel = statusBreakdownParts.join(", ")

  return {
    key: "open-reports",
    title,
    description:
      `Há ${openReports.length} relatos anônimos pendentes (${statusBreakdownLabel}). ` +
      `O mais antigo foi registrado ${oldestDaysAgoLabel}. ` +
      `Categorias identificadas: ${topCategoriesFormatted}. ` +
      `Cada relato representa um colaborador que buscou ajuda — a resposta ágil demonstra comprometimento e é exigida indiretamente pela NR-1.`,
    priority: "medium",
    reason: `${openReports.length} relatos em aberto ou análise — mais antigo ${oldestDaysAgoLabel}`,
    tasks: [
      "Triagem e categorização dos relatos recebidos",
      "Definir responsável por cada categoria de relato",
      "Elaborar plano de resposta e comunicação interna",
      "Registrar ações tomadas para evidência no PGR",
    ],
  }
}

function buildDispatchSuggestion(
  lowAdherenceDispatches: LowAdherenceDispatch[],
  existingTitles: Set<string>,
): ActionPlanSuggestion | null {
  const topDispatch = lowAdherenceDispatches[0]
  if (!topDispatch) return null
  const deptName = topDispatch.surveyConfiguration?.department?.name ?? "geral"
  const title = `Aumentar adesão às pesquisas — ${deptName}`
  if (existingTitles.has(title.toLowerCase())) return null

  const adherencePct = Math.round((topDispatch.totalResponses / topDispatch.totalRecipients) * 100)
  const missingCount = topDispatch.totalRecipients - topDispatch.totalResponses
  const dateLabel =
    topDispatch.dispatchedAt !== null
      ? `enviada em ${formatDateAsBrazilian(topDispatch.dispatchedAt)}`
      : "pesquisa recente"

  return {
    key: `dispatch-low-adherence-${topDispatch.id}`,
    title,
    description:
      `Na pesquisa ${dateLabel} ao setor ${deptName}: ` +
      `${topDispatch.totalResponses} de ${topDispatch.totalRecipients} colaboradores responderam ` +
      `(${adherencePct}% de adesão — meta: ≥80%). ` +
      `${missingCount} pessoas não foram alcançadas. ` +
      `Dados desrepresentativos comprometem a detecção precoce de riscos psicossociais e a evidência documental exigida pela NR-1.`,
    priority: "medium",
    reason: `Pesquisa ${dateLabel} no setor ${deptName}: ${adherencePct}% de adesão (${topDispatch.totalResponses}/${topDispatch.totalRecipients})`,
    tasks: [
      "Informar colaboradores sobre a importância das pesquisas de bem-estar",
      "Verificar se os links chegaram corretamente (checar registros de envio)",
      "Alinhar com gestores a divulgação interna do programa",
      "Revisar janela de horário configurada para o setor",
    ],
  }
}

function buildConsentSuggestion(
  consentDeptGroups: ConsentDeptGroup[],
  deptNamesById: Map<string, string>,
  existingTitles: Set<string>,
): ActionPlanSuggestion | null {
  const totalWithoutConsent = consentDeptGroups.reduce((sum, g) => sum + g._count.departmentId, 0)
  if (totalWithoutConsent === 0) return null
  const title = "Engajamento no TCLE — colaboradores sem aceite"
  if (existingTitles.has(title.toLowerCase())) return null

  const isPlural = totalWithoutConsent > 1
  const deptBreakdownFormatted = consentDeptGroups
    .slice(0, 3)
    .map((g) => `${deptNamesById.get(g.departmentId) ?? "setor desconhecido"} (${g._count.departmentId})`)
    .join(", ")

  return {
    key: "consent-pending",
    title,
    description:
      `${totalWithoutConsent} colaborador${isPlural ? "es" : ""} ativo${isPlural ? "s" : ""} ` +
      `não ${isPlural ? "aceitaram" : "aceitou"} o Termo de Consentimento — distribuídos em: ${deptBreakdownFormatted}. ` +
      `Sem o aceite, esses colaboradores ficam excluídos das pesquisas e das métricas de saúde ocupacional, ` +
      `reduzindo a representatividade dos dados e comprometendo a documentação de conformidade com a NR-1.`,
    priority: "medium",
    reason: `${totalWithoutConsent} colaborador${isPlural ? "es" : ""} sem TCLE aceito — ${deptBreakdownFormatted}`,
    tasks: [
      "Identificar colaboradores com aceite pendente por setor",
      "Reenviar link do TCLE via WhatsApp/SMS para esses colaboradores",
      "Comunicar gestores sobre a importância do aceite nos seus setores",
      "Registrar colaboradores que recusaram explicitamente",
    ],
  }
}

function buildPgrSuggestion(
  lastPgrReview: { period: string; createdAt: Date } | null,
  thisMonthStart: Date,
  existingTitles: Set<string>,
): ActionPlanSuggestion | null {
  const hasReviewThisMonth = lastPgrReview !== null && lastPgrReview.createdAt >= thisMonthStart
  if (hasReviewThisMonth) return null
  const title = "Geração do relatório PGR do mês"
  if (existingTitles.has(title.toLowerCase())) return null

  const currentMonthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  const lastReviewContext =
    lastPgrReview !== null
      ? `O último relatório foi gerado em ${formatDateAsBrazilian(lastPgrReview.createdAt)} (período: ${lastPgrReview.period}).`
      : "Nenhum relatório PGR foi gerado até o momento."

  return {
    key: "pgr-missing",
    title,
    description:
      `Nenhum relatório PGR foi gerado para ${currentMonthLabel}. ` +
      `${lastReviewContext} ` +
      `A NR-1 exige que as empresas documentem e revisem periodicamente os riscos psicossociais — ` +
      `o relatório mensal é a principal evidência de conformidade.`,
    priority: "low",
    reason:
      lastPgrReview !== null
        ? `Relatório PGR pendente para ${currentMonthLabel} — último: ${lastPgrReview.period}`
        : `Nenhum relatório PGR registrado (${currentMonthLabel})`,
    tasks: [
      "Acessar o módulo PGR e gerar o relatório do período",
      "Revisar os indicadores de saúde por setor",
      "Registrar observações e planos de melhoria",
      "Armazenar o relatório na documentação da empresa",
    ],
  }
}

function appendIfSlotAvailable(
  suggestions: ActionPlanSuggestion[],
  candidate: ActionPlanSuggestion | null,
): void {
  if (candidate !== null && suggestions.length < 3) {
    suggestions.push(candidate)
  }
}

export async function computeRawSuggestions(tenantId: string): Promise<ActionPlanSuggestion[]> {
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [openAlerts, openReports, recentPlanTitles, consentDeptGroups, lastPgrReview, recentDispatches] = await Promise.all([
    prisma.alert.findMany({
      where: { tenantId, resolvedAt: null },
      select: {
        id: true,
        type: true,
        severity: true,
        departmentId: true,
        message: true,
        createdAt: true,
        department: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.anonymousReport.findMany({
      where: { tenantId, status: { in: ["open", "analyzing"] } },
      select: { category: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.actionPlan.findMany({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      select: { title: true },
    }),
    prisma.employee.groupBy({
      by: ["departmentId"],
      where: { tenantId, status: "active", consents: { none: { event: "accepted" } } },
      _count: { departmentId: true },
      orderBy: { _count: { departmentId: "desc" } },
    }),
    prisma.pgrReview.findFirst({
      where: { tenantId },
      select: { period: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.surveyDispatch.findMany({
      where: { tenantId, status: "sent", dispatchedAt: { gte: thirtyDaysAgo }, totalRecipients: { gt: 0 } },
      select: {
        id: true,
        totalRecipients: true,
        totalResponses: true,
        dispatchedAt: true,
        surveyConfiguration: { select: { department: { select: { name: true } } } },
      },
      orderBy: { dispatchedAt: "desc" },
      take: 10,
    }),
  ])

  const consentDeptIds = consentDeptGroups.map((g) => g.departmentId)
  const consentDepts =
    consentDeptIds.length > 0
      ? await prisma.department.findMany({
          where: { id: { in: consentDeptIds } },
          select: { id: true, name: true },
        })
      : []
  const deptNamesById = new Map(consentDepts.map((d) => [d.id, d.name]))

  const lowAdherenceDispatches = recentDispatches.filter(
    (d) => d.totalResponses / d.totalRecipients < 0.8,
  )

  const existingTitles = new Set(recentPlanTitles.map((p: { title: string }) => p.title.toLowerCase()))
  const seenKeys = new Set<string>()
  const suggestions: ActionPlanSuggestion[] = []

  suggestions.push(...pickAlertSuggestions(openAlerts, existingTitles, seenKeys, 6))
  appendIfSlotAvailable(suggestions, buildReportSuggestion(openReports, existingTitles))
  appendIfSlotAvailable(suggestions, buildDispatchSuggestion(lowAdherenceDispatches, existingTitles))
  appendIfSlotAvailable(suggestions, buildConsentSuggestion(consentDeptGroups, deptNamesById, existingTitles))
  appendIfSlotAvailable(suggestions, buildPgrSuggestion(lastPgrReview, thisMonthStart, existingTitles))

  return suggestions
}
