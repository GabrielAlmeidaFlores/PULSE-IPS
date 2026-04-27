import type { ActionPlanSuggestion, AlertWithContext } from "@/modules/action-plans/suggestions/types"

export const ALERT_TASKS: Record<string, string[]> = {
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

export const ALERT_PRIORITY: Record<string, "low" | "medium" | "high"> = {
  score_drop: "high",
  low_score: "high",
  negative_trend: "high",
  low_adherence: "medium",
  no_response: "medium",
}

const ALERT_TITLE_BY_TYPE: Record<string, string> = {
  score_drop: "Intervenção de bem-estar",
  low_score: "Índice de bem-estar abaixo do esperado",
  negative_trend: "Plano de melhoria contínua",
  low_adherence: "Engajamento nas pesquisas",
  no_response: "Pesquisa sem respostas registradas",
}

const ALERT_CONTEXT_BY_TYPE: Record<string, string> = {
  score_drop:
    "Quedas de score costumam indicar aumento de pressão, sobrecarga ou conflitos não endereçados. Agir rapidamente reduz o risco de agravamento e demonstra comprometimento com a saúde ocupacional da equipe.",
  low_score:
    "Scores persistentemente baixos estão associados a burnout, queda de produtividade e aumento de turnover. É necessário investigar as causas e implementar ações estruturadas.",
  negative_trend:
    "Tendências negativas prolongadas aumentam o risco de burnout e comprometem as obrigações legais trabalhistas. O problema se agrava a cada ciclo sem intervenção.",
  low_adherence:
    "Baixa participação compromete a representatividade dos dados e pode mascarar problemas reais de saúde no time. Dados insuficientes impedem a detecção precoce de riscos.",
  no_response:
    "Sem respostas, não é possível monitorar o bem-estar do setor. A ausência de dados compromete tanto a gestão interna quanto a documentação de conformidade legal.",
}

const SEVERITY_LABEL_BY_VALUE: Record<string, string> = {
  critical: "crítica",
  warning: "atenção",
  info: "informativa",
}

export const SUPPORTED_ALERT_TYPES = new Set(Object.keys(ALERT_TASKS))

export const ALERT_TYPE_ORDER = ["score_drop", "low_score", "negative_trend", "low_adherence", "no_response"]

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

export function buildAlertDescription(alert: AlertWithContext): string {
  const deptName = alert.department?.name ?? "geral"
  const severityLabel = SEVERITY_LABEL_BY_VALUE[alert.severity] ?? alert.severity
  const daysAgoLabel = formatDaysAgoLabel(alert.createdAt)
  const typeContext = ALERT_CONTEXT_BY_TYPE[alert.type] ?? ""

  return `Alerta gerado em ${formatDateAsBrazilian(alert.createdAt)} (${daysAgoLabel}) — setor: ${deptName}, severidade: ${severityLabel}. Dado registrado pelo sistema: "${alert.message}". ${typeContext}`.trim()
}

export function buildSuggestionFromAlert(alert: AlertWithContext): ActionPlanSuggestion | null {
  if (!SUPPORTED_ALERT_TYPES.has(alert.type)) return null
  const deptName = alert.department?.name ?? "geral"
  const titleBase = ALERT_TITLE_BY_TYPE[alert.type] ?? "Ação necessária"
  const daysAgoLabel = formatDaysAgoLabel(alert.createdAt)

  const reasonByType: Record<string, string> = {
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

export function pickAlertSuggestions(
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
