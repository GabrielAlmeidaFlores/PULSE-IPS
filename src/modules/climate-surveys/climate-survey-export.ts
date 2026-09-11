import {
  formatClimateSurveyEnps,
  formatClimateSurveyPercent,
  type ClimateSurveyModuleDashboard,
} from "@/modules/climate-surveys/climate-survey.types"

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildClimateSurveyHeatmapCsv(heatmap: ClimateSurveyModuleDashboard["heatmap"]): string {
  const header = ["Tópico", ...heatmap.departments.map((department) => department.name)]
  const lines: string[] = [header.map(escapeCsvField).join(",")]
  for (const topic of heatmap.topics) {
    const values = heatmap.departments.map((department) => {
      const cell = heatmap.cells.find(
        (entry) => entry.dimension === topic.dimension && entry.departmentId === department.id,
      )
      return formatClimateSurveyPercent(cell?.favorabilityPercent ?? null)
    })
    lines.push([topic.label, ...values].map(escapeCsvField).join(","))
  }
  const totalsById = new Map(heatmap.departmentTotals.map((total) => [total.departmentId, total]))
  const enpsValues = heatmap.departments.map((department) =>
    formatClimateSurveyEnps(totalsById.get(department.id)?.enps ?? null),
  )
  lines.push([`eNPS (empresa: ${formatClimateSurveyEnps(heatmap.companyEnps)})`, ...enpsValues].map(escapeCsvField).join(","))
  const scoreValues = heatmap.departments.map((department) =>
    formatClimateSurveyPercent(totalsById.get(department.id)?.scorePercent ?? null),
  )
  lines.push(
    [`Score Total (empresa: ${formatClimateSurveyPercent(heatmap.companyScorePercent)})`, ...scoreValues]
      .map(escapeCsvField)
      .join(","),
  )
  return `\uFEFF${lines.join("\n")}`
}
