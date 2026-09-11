"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { formatClimateSurveyEnps, type ClimateSurveyEnpsBreakdown } from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  breakdown: ClimateSurveyEnpsBreakdown
}

const SEGMENT_COLORS: Record<string, string> = {
  Promotores: "var(--status-success)",
  Neutros: "var(--muted-foreground)",
  Detratores: "var(--status-danger)",
}

const SEGMENT_BG_CLASSES: Record<string, string> = {
  Promotores: "bg-status-success",
  Neutros: "bg-muted-foreground",
  Detratores: "bg-status-danger",
}

function segmentColor(name: string): string {
  return SEGMENT_COLORS[name] ?? "var(--muted-foreground)"
}

function segmentBgClass(name: string): string {
  return SEGMENT_BG_CLASSES[name] ?? "bg-muted-foreground"
}

function computeIntegerPercentages(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total === 0) return values.map(() => 0)
  const exact = values.map((value) => (value / total) * 100)
  const floored = exact.map((value) => Math.floor(value))
  let remainder = 100 - floored.reduce((sum, value) => sum + value, 0)
  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
  const result = [...floored]
  for (const entry of byFraction) {
    if (remainder <= 0) break
    result[entry.index] = (result[entry.index] ?? 0) + 1
    remainder -= 1
  }
  return result
}

interface DonutTooltipPayload {
  name: string
  value: number
  payload: { percent: number }
}

interface DonutTooltipProps {
  active?: boolean
  payload?: DonutTooltipPayload[]
}

function DonutTooltip({ active, payload }: DonutTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-foreground mb-1">{item.name}</p>
      <p className="text-muted-foreground">
        {item.value} ({item.payload.percent}%)
      </p>
    </div>
  )
}

export function ClimateSurveyEnpsDonutChart({ breakdown }: Props): React.ReactElement {
  if (breakdown.total === 0) {
    return <p className="text-xs text-muted-foreground text-center py-10">Sem respondentes suficientes para o eNPS.</p>
  }

  const percentages = computeIntegerPercentages([
    breakdown.promoters,
    breakdown.neutrals,
    breakdown.detractors,
  ])
  const segments = [
    { name: "Promotores", value: breakdown.promoters, percent: percentages[0] ?? 0 },
    { name: "Neutros", value: breakdown.neutrals, percent: percentages[1] ?? 0 },
    { name: "Detratores", value: breakdown.detractors, percent: percentages[2] ?? 0 },
  ].filter((row) => row.value > 0)

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={segments.length > 1 ? 2 : 0}
              stroke="var(--card)"
            >
              {segments.map((entry) => (
                <Cell key={entry.name} fill={segmentColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums text-foreground">{formatClimateSurveyEnps(breakdown.score)}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">eNPS</p>
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 ${segmentBgClass(segment.name)}`} />
              <span className="text-muted-foreground">{segment.name}</span>
            </span>
            <span className="tabular-nums font-bold text-foreground">{segment.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
