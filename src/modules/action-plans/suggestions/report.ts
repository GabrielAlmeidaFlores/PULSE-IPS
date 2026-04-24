import type { ActionPlanSuggestion, ReportItem } from "@/modules/action-plans/suggestions/types"

const REPORT_CATEGORY_LABEL_BY_VALUE: Record<string, string> = {
  harassment: "assédio",
  overload: "sobrecarga",
  conflict: "conflito",
  physical_environment: "ambiente físico",
  other: "outros",
}

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

export function buildReportSuggestion(
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

export { formatDateAsBrazilian, formatDaysAgoLabel }
