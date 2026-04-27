import type { ActionPlanSuggestion, ConsentDeptGroup } from "@/modules/action-plans/suggestions/types"

export function buildConsentSuggestion(
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
      `reduzindo a representatividade dos dados e comprometendo a documentação de conformidade legal.`,
    priority: "medium",
    reason: `${totalWithoutConsent} colaborador${isPlural ? "es" : ""} sem TCLE aceito — ${deptBreakdownFormatted}`,
    tasks: [
      "Identificar colaboradores com aceite pendente por setor",
      "Reenviar o convite de aceite do TCLE para esses colaboradores",
      "Comunicar gestores sobre a importância do aceite nos seus setores",
      "Registrar colaboradores que recusaram explicitamente",
    ],
  }
}
