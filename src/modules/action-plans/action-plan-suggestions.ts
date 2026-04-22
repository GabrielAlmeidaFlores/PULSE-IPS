import { prisma } from "@/libs/db"

export interface ActionPlanSuggestion {
  key: string
  title: string
  description: string
  priority: "low" | "medium" | "high"
  reason: string
  tasks: string[]
}

interface AlertWithDept {
  id: string
  type: string
  severity: string
  departmentId: string | null
  department: { name: string } | null
}

interface LowAdherenceDispatch {
  id: string
  totalRecipients: number
  totalResponses: number
  surveyConfiguration: { department: { name: string } | null } | null
}

const SUGGESTION_TEMPLATES: Record<string, (deptName: string) => Omit<ActionPlanSuggestion, "key" | "reason" | "priority">> = {
  crisis_report: (dept) => ({
    title: `Resposta a relato de crise — ${dept}`,
    description: `Um relato com indicação de situação crítica foi identificado no setor ${dept}. Ação imediata é necessária para garantir o bem-estar do colaborador e do time.`,
    tasks: [
      "Acionar canal de suporte psicológico disponível",
      "Comunicar equipe sobre recursos de apoio (CVV: 188)",
      "Revisar protocolo de crise com o RH",
      "Acompanhar evolução do clima no setor",
    ],
  }),
  score_drop: (dept) => ({
    title: `Intervenção de bem-estar — ${dept}`,
    description: `O score de satisfação do setor ${dept} apresentou queda significativa. Investigar causas e implementar ações de suporte reduz o risco de agravamento.`,
    tasks: [
      "Reunião de diagnóstico com liderança do setor",
      "Levantamento dos principais fatores de risco relatados",
      "Definir medidas corretivas e responsáveis",
      "Monitorar evolução nas próximas pesquisas",
    ],
  }),
  negative_trend: (dept) => ({
    title: `Plano de melhoria contínua — ${dept}`,
    description: `O setor ${dept} apresenta tendência negativa por três ou mais períodos consecutivos. É importante agir antes que o problema se consolide.`,
    tasks: [
      "Análise detalhada das respostas dos últimos períodos",
      "Reunião com liderança para identificar causas raiz",
      "Definir metas de melhoria e prazo de reavaliação",
      "Revisão do processo de trabalho no setor",
    ],
  }),
  low_adherence: (dept) => ({
    title: `Engajamento nas pesquisas — ${dept}`,
    description: `A taxa de participação nas pesquisas do setor ${dept} está abaixo do esperado. Alta adesão é fundamental para resultados representativos.`,
    tasks: [
      "Comunicado interno sobre a importância das pesquisas",
      "Alinhamento com gestores e lideranças do setor",
      "Revisar horário e frequência de envio das pesquisas",
    ],
  }),
}

const PRIORITY_BY_TYPE: Record<string, "low" | "medium" | "high"> = {
  crisis_report: "high",
  score_drop: "high",
  negative_trend: "high",
  low_adherence: "medium",
}

const TYPE_ORDER = ["crisis_report", "score_drop", "negative_trend", "low_adherence"]

function buildSuggestionFromAlert(alert: AlertWithDept): ActionPlanSuggestion | null {
  const template = SUGGESTION_TEMPLATES[alert.type]
  if (!template) return null
  const deptName = alert.department?.name ?? "geral"
  const built = template(deptName)
  const reasonMap: Record<string, string> = {
    crisis_report: `Alerta de crise ativo no setor ${deptName}`,
    score_drop: `Queda de score detectada no setor ${deptName}`,
    negative_trend: `Tendência negativa por múltiplos períodos — ${deptName}`,
    low_adherence: `Baixa adesão às pesquisas no setor ${deptName}`,
  }
  return {
    key: `alert-${alert.type}-${alert.departmentId ?? "global"}`,
    ...built,
    priority: PRIORITY_BY_TYPE[alert.type] ?? "medium",
    reason: reasonMap[alert.type] ?? `Alerta ${alert.type}`,
  }
}

function pickAlertSuggestions(
  openAlerts: AlertWithDept[],
  existingTitles: Set<string>,
  seenKeys: Set<string>,
  slots: number,
): ActionPlanSuggestion[] {
  const result: ActionPlanSuggestion[] = []
  for (const type of TYPE_ORDER) {
    if (result.length >= slots) break
    const topAlert = openAlerts.find((a) => a.type === type)
    if (!topAlert) continue
    const suggestion = buildSuggestionFromAlert(topAlert)
    if (!suggestion || seenKeys.has(suggestion.key) || existingTitles.has(suggestion.title.toLowerCase())) continue
    seenKeys.add(suggestion.key)
    result.push(suggestion)
  }
  return result
}

function buildReportSuggestion(
  openReportCount: number,
  existingTitles: Set<string>,
): ActionPlanSuggestion | null {
  if (openReportCount < 3) return null
  const title = "Tratamento de relatos anônimos pendentes"
  if (existingTitles.has(title.toLowerCase())) return null
  return {
    key: "open-reports",
    title,
    description: `Há ${openReportCount} relatos anônimos em aberto. Tratar com agilidade demonstra comprometimento com o bem-estar e fortalece a confiança do time.`,
    priority: "medium",
    reason: `${openReportCount} relatos em aberto ou em análise`,
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
  const top = lowAdherenceDispatches[0]
  if (!top) return null
  const deptName = top.surveyConfiguration?.department?.name ?? "geral"
  const adherencePct = Math.round((top.totalResponses / top.totalRecipients) * 100)
  const title = `Aumentar adesão às pesquisas — ${deptName}`
  if (existingTitles.has(title.toLowerCase())) return null
  return {
    key: `dispatch-low-adherence-${top.id}`,
    title,
    description: `Uma pesquisa recente do setor ${deptName} teve apenas ${adherencePct}% de participação. Engajar colaboradores nas pesquisas garante dados representativos e conformidade com a NR-1.`,
    priority: "medium",
    reason: `Pesquisa recente com ${adherencePct}% de adesão no setor ${deptName}`,
    tasks: [
      "Informar colaboradores sobre a importância das pesquisas de bem-estar",
      "Verificar se os links chegaram corretamente (checar registros de envio)",
      "Alinhar com gestores a divulgação interna do programa",
      "Revisar janela de horário configurada para o setor",
    ],
  }
}

function buildConsentSuggestion(
  employeesWithoutConsent: number,
  existingTitles: Set<string>,
): ActionPlanSuggestion | null {
  if (employeesWithoutConsent === 0) return null
  const title = "Engajamento no TCLE — colaboradores sem aceite"
  if (existingTitles.has(title.toLowerCase())) return null
  const plural = employeesWithoutConsent > 1
  return {
    key: "consent-pending",
    title,
    description: `${employeesWithoutConsent} colaborador${plural ? "es" : ""} ativo${plural ? "s" : ""} ainda ${plural ? "não aceitaram" : "não aceitou"} o Termo de Consentimento. Sem o aceite, eles não recebem pesquisas e não entram nas métricas de bem-estar.`,
    priority: "medium",
    reason: `${employeesWithoutConsent} colaborador${plural ? "es" : ""} sem TCLE aceito`,
    tasks: [
      "Identificar colaboradores com aceite pendente",
      "Reenviar link do TCLE via WhatsApp/SMS",
      "Comunicar gestores sobre a importância do aceite",
      "Registrar colaboradores que recusaram explicitamente",
    ],
  }
}

function buildPgrSuggestion(
  recentPgr: { id: string } | null,
  existingTitles: Set<string>,
): ActionPlanSuggestion | null {
  if (recentPgr !== null) return null
  const title = "Geração do relatório PGR do mês"
  if (existingTitles.has(title.toLowerCase())) return null
  return {
    key: "pgr-missing",
    title,
    description: "Nenhum relatório PGR foi gerado neste mês. A NR-1 exige documentação periódica dos riscos psicossociais — gerar o relatório garante conformidade e mantém o histórico de evidências.",
    priority: "low",
    reason: "Relatório PGR não gerado neste mês",
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

export async function getActionPlanSuggestions(tenantId: string): Promise<ActionPlanSuggestion[]> {
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const [openAlerts, openReportCount, recentPlanTitles, employeesWithoutConsent, recentPgr, recentDispatches] = await Promise.all([
    prisma.alert.findMany({
      where: { tenantId, resolvedAt: null },
      select: { id: true, type: true, severity: true, departmentId: true, department: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.anonymousReport.count({ where: { tenantId, status: { in: ["open", "analyzing"] } } }),
    prisma.actionPlan.findMany({
      where: { tenantId, createdAt: { gte: sixtyDaysAgo } },
      select: { title: true },
    }),
    prisma.employee.count({
      where: { tenantId, status: "active", consents: { none: { event: "accepted" } } },
    }),
    prisma.pgrReview.findFirst({
      where: { tenantId, createdAt: { gte: thisMonthStart } },
      select: { id: true },
    }),
    prisma.surveyDispatch.findMany({
      where: { tenantId, status: "sent", dispatchedAt: { gte: thirtyDaysAgo }, totalRecipients: { gt: 0 } },
      select: {
        id: true,
        totalRecipients: true,
        totalResponses: true,
        surveyConfiguration: { select: { department: { select: { name: true } } } },
      },
      orderBy: { dispatchedAt: "desc" },
      take: 10,
    }),
  ])

  const lowAdherenceDispatches = recentDispatches.filter(
    (d) => d.totalResponses / d.totalRecipients < 0.8
  )

  const existingTitles = new Set(recentPlanTitles.map((p: { title: string }) => p.title.toLowerCase()))
  const seenKeys = new Set<string>()
  const suggestions: ActionPlanSuggestion[] = []

  suggestions.push(...pickAlertSuggestions(openAlerts, existingTitles, seenKeys, 3))
  appendIfSlotAvailable(suggestions, buildReportSuggestion(openReportCount, existingTitles))
  appendIfSlotAvailable(suggestions, buildDispatchSuggestion(lowAdherenceDispatches, existingTitles))
  appendIfSlotAvailable(suggestions, buildConsentSuggestion(employeesWithoutConsent, existingTitles))
  appendIfSlotAvailable(suggestions, buildPgrSuggestion(recentPgr, existingTitles))

  return suggestions.slice(0, 3)
}
