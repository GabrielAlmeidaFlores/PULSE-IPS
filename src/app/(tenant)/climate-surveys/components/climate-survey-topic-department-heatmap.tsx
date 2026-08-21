import type { ClimateSurveyModuleDashboard, ClimateSurveyMetricStatus } from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  heatmap: ClimateSurveyModuleDashboard["heatmap"]
}

function cellClass(status: ClimateSurveyMetricStatus): string {
  if (status === "above_goal") return "bg-status-success-subtle text-status-success border-status-success-border"
  if (status === "attention") return "bg-status-warning-subtle text-status-warning border-status-warning-border"
  if (status === "critical") return "bg-status-danger-subtle text-status-danger border-status-danger-border"
  return "bg-muted text-muted-foreground border-border"
}

export function ClimateSurveyTopicDepartmentHeatmap({ heatmap }: Props): React.ReactElement {
  if (heatmap.departments.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-10">Nenhum setor disponível para o heatmap.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky left-0 bg-card">
              Tópico
            </th>
            {heatmap.departments.map((department) => (
              <th key={department.id} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {department.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heatmap.topics.map((topic) => (
            <tr key={topic.dimension} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-[11px] font-medium text-foreground sticky left-0 bg-card max-w-[220px]">
                {topic.label}
              </td>
              {heatmap.departments.map((department) => {
                const cell = heatmap.cells.find(
                  (entry) => entry.dimension === topic.dimension && entry.departmentId === department.id,
                )
                const status = cell?.status ?? "unavailable"
                const value = cell?.scorePercent
                return (
                  <td key={`${topic.dimension}-${department.id}`} className="px-2 py-2 text-center">
                    <span className={`inline-flex min-w-[3.25rem] justify-center px-2 py-1 border text-[11px] font-bold tabular-nums ${cellClass(status)}`}>
                      {value === null || value === undefined ? "—" : `${value}%`}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
