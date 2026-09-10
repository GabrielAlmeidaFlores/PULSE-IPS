"use client"

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { WorkforceEvolutionPoint } from "@/modules/workforce/workforce.types"

interface WorkforceEvolutionChartProps {
  points: WorkforceEvolutionPoint[]
}

export function WorkforceEvolutionChart({ points }: WorkforceEvolutionChartProps): React.ReactElement {
  if (points.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-10">Sem dados de evolução.</p>
  }

  const data = points.map((point) => ({
    label: point.competencia,
    headcount: point.headcount,
    turnover: point.turnoverPercent,
    absenteismo: point.absenteeismPercent,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="right" dataKey="headcount" name="Headcount" fill="var(--primary)" />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="turnover"
          name="Turnover %"
          stroke="var(--status-warning)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls={false}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="absenteismo"
          name="Absenteísmo %"
          stroke="var(--status-danger)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
