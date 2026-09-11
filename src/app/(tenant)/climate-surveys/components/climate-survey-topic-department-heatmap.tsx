"use client"

import { useRef, useState } from "react"
import { toPng } from "html-to-image"
import { FileDown, ImageDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildClimateSurveyHeatmapCsv } from "@/modules/climate-surveys/climate-survey-export"
import {
  formatClimateSurveyEnps,
  formatClimateSurveyPercent,
  resolveClimateSurveyEnpsHeatmapBand,
  resolveClimateSurveyHeatmapBand,
  type ClimateSurveyHeatmapBand,
  type ClimateSurveyModuleDashboard,
} from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  heatmap: ClimateSurveyModuleDashboard["heatmap"]
  goalPercent: number
}

function cellClass(band: ClimateSurveyHeatmapBand | null): string {
  if (band === "strong") return "bg-status-success-subtle text-status-success border-status-success-border"
  if (band === "on_goal") return "bg-status-success-subtle/40 text-status-success border-status-success-border"
  if (band === "attention") return "bg-status-warning-subtle text-status-warning border-status-warning-border"
  if (band === "critical") return "bg-status-danger-subtle text-status-danger border-status-danger-border"
  return "bg-muted text-muted-foreground border-border"
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ClimateSurveyTopicDepartmentHeatmap({ heatmap, goalPercent }: Props): React.ReactElement {
  const tableRef = useRef<HTMLDivElement>(null)
  const [exportingImage, setExportingImage] = useState(false)
  const [imageError, setImageError] = useState(false)

  if (heatmap.departments.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-10">Nenhum setor disponível para o heatmap.</p>
  }

  const departmentTotalsById = new Map(heatmap.departmentTotals.map((total) => [total.departmentId, total]))

  function handleExportCsv(): void {
    downloadBlob(
      new Blob([buildClimateSurveyHeatmapCsv(heatmap)], { type: "text/csv;charset=utf-8;" }),
      "mapa-de-calor-clima.csv",
    )
  }

  async function handleExportImage(): Promise<void> {
    const node = tableRef.current
    if (node === null) return
    setExportingImage(true)
    setImageError(false)
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2 })
      const anchor = document.createElement("a")
      anchor.href = dataUrl
      anchor.download = "mapa-de-calor-clima.png"
      anchor.click()
    } catch {
      setImageError(true)
    } finally {
      setExportingImage(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <FileDown className="w-3.5 h-3.5" />
          Exportar CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportImage}
          disabled={exportingImage}
          className="gap-1.5"
        >
          {exportingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}
          {exportingImage ? "Gerando imagem..." : "Exportar imagem"}
        </Button>
      </div>
      {imageError && <p className="text-[10px] text-status-danger text-right mb-2">Não foi possível gerar a imagem.</p>}
      <div className="overflow-x-auto">
        <div ref={tableRef} className="bg-card w-max">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky left-0 bg-card">
                  Tópico
                </th>
                {heatmap.departments.map((department) => (
                  <th
                    key={department.id}
                    className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
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
                    const band = cell?.band ?? null
                    const value = cell?.favorabilityPercent ?? null
                    return (
                      <td key={`${topic.dimension}-${department.id}`} className="px-2 py-2 text-center">
                        <span
                          className={`inline-flex min-w-[3.25rem] justify-center px-2 py-1 border text-[11px] font-bold tabular-nums ${cellClass(band)}`}
                        >
                          {formatClimateSurveyPercent(value)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td className="px-3 py-2 text-[11px] font-bold text-foreground sticky left-0 bg-card max-w-[220px]">
                  <span className="flex items-center justify-between gap-3">
                    <span>eNPS</span>
                    <span className="tabular-nums">{formatClimateSurveyEnps(heatmap.companyEnps)}</span>
                  </span>
                </td>
                {heatmap.departments.map((department) => {
                  const value = departmentTotalsById.get(department.id)?.enps ?? null
                  return (
                    <td key={`enps-${department.id}`} className="px-2 py-2 text-center">
                      <span
                        className={`inline-flex min-w-[3.25rem] justify-center px-2 py-1 border text-[11px] font-bold tabular-nums ${cellClass(value === null ? null : resolveClimateSurveyEnpsHeatmapBand(value))}`}
                      >
                        {formatClimateSurveyEnps(value)}
                      </span>
                    </td>
                  )
                })}
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2 text-[11px] font-bold text-foreground sticky left-0 bg-card max-w-[220px]">
                  <span className="flex items-center justify-between gap-3">
                    <span>Score Total</span>
                    <span className="tabular-nums">{formatClimateSurveyPercent(heatmap.companyScorePercent)}</span>
                  </span>
                </td>
                {heatmap.departments.map((department) => {
                  const value = departmentTotalsById.get(department.id)?.scorePercent ?? null
                  return (
                    <td key={`score-${department.id}`} className="px-2 py-2 text-center">
                      <span
                        className={`inline-flex min-w-[3.25rem] justify-center px-2 py-1 border text-[11px] font-bold tabular-nums ${cellClass(value === null ? null : resolveClimateSurveyHeatmapBand(value, goalPercent))}`}
                      >
                        {formatClimateSurveyPercent(value)}
                      </span>
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
