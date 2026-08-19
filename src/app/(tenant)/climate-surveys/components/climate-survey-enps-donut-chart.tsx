"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { ClimateSurveyEnpsBreakdown } from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  breakdown: ClimateSurveyEnpsBreakdown
}

const SEGMENT_COLORS = {
  Promotores: "var(--status-success)",
  Neutros: "var(--status-warning)",
  Detratores: "var(--status-danger)",
} as const

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

  const data = [
    { name: "Promotores", value: breakdown.promoters, percent: Math.round((breakdown.promoters / breakdown.total) * 100) },
    { name: "Neutros", value: breakdown.neutrals, percent: Math.round((breakdown.neutrals / breakdown.total) * 100) },
    { name: "Detratores", value: breakdown.detractors, percent: Math.round((breakdown.detractors / breakdown.total) * 100) },
  ].filter((row) => row.value > 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2} stroke="var(--card)">
            {data.map((entry) => (
              <Cell key={entry.name} fill={SEGMENT_COLORS[entry.name as keyof typeof SEGMENT_COLORS]} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center -mt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">eNPS</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{breakdown.score ?? "—"}</p>
        </div>
      </div>
    </div>
  )
}
