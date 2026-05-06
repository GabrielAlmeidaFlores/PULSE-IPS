import type { ActionPlanSuggestion, LowAdherenceDispatch } from "@/modules/action-plans/suggestions/types"
import { formatDateAsBrazilian } from "@/modules/action-plans/suggestions/report"

export function buildDispatchSuggestion(
  lowAdherenceDispatches: LowAdherenceDispatch[],
  existingTitles: Set<string>,
): ActionPlanSuggestion | null {
  const topDispatch = lowAdherenceDispatches[0]
  if (!topDispatch || topDispatch.totalRecipients === 0) return null
  const deptName = topDispatch.healthSurveyConfiguration?.department?.name ?? "geral"
  const title = `Aumentar adesão às pesquisas — ${deptName}`
  if (existingTitles.has(title.toLowerCase())) return null

  const adherencePct = Math.round((topDispatch.totalResponses / topDispatch.totalRecipients) * 100)
  const missingCount = topDispatch.totalRecipients - topDispatch.totalResponses
  const dateLabel =
    topDispatch.dispatchedAt !== null
      ? `disponibilizada em ${formatDateAsBrazilian(topDispatch.dispatchedAt)}`
      : "pesquisa recente"

  return {
    key: `dispatch-low-adherence-${topDispatch.id}`,
    title,
    description:
      `Na pesquisa ${dateLabel} ao setor ${deptName}: ` +
      `${topDispatch.totalResponses} de ${topDispatch.totalRecipients} colaboradores responderam ` +
      `(${adherencePct}% de adesão — meta: ≥80%). ` +
      `${missingCount} respostas não foram recebidas. ` +
      `Dados desrepresentativos comprometem a detecção precoce de riscos psicossociais e a evidência documental exigida pela legislação trabalhista.`,
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
