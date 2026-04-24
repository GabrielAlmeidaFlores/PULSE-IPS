import type { ActionPlanSuggestion } from "@/modules/action-plans/suggestions/types"
import { formatDateAsBrazilian, formatDaysAgoLabel } from "@/modules/action-plans/suggestions/report"

export function buildPgrSuggestion(
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

export { formatDaysAgoLabel }
