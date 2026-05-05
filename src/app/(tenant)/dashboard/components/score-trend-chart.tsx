"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import type { TrendPoint } from "@/modules/dashboard/dashboard.service"
import { healthIndexChartColor } from "@/libs/utils/health-index"

interface TooltipPayloadItem {
  value: number
  payload: TrendPoint
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const point = payload[0]
  if (!point) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Índice de Saúde: <span className="font-bold text-foreground">{point.value}%</span></p>
      <p className="text-muted-foreground">Respostas: <span className="font-bold text-foreground">{point.payload.responses}</span></p>
    </div>
  )
}

interface Props {
  data: TrendPoint[]
}

interface TickProps {
  x?: number
  y?: number
  payload?: { value: unknown }
}

function XTick({ x, y, payload }: TickProps): React.ReactElement {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" transform={`rotate(-35, ${x}, ${y})`} style={{ fill: "var(--muted-foreground)", fontSize: 11 }}>
      {String(payload?.value ?? "")}
    </text>
  )
}

function YTick({ x, y, payload }: TickProps): React.ReactElement {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" style={{ fill: "var(--muted-foreground)", fontSize: 11 }}>
      {`${payload?.value}%`}
    </text>
  )
}

export function ScoreTrendChart({ data }: Props): React.ReactElement {
  const lastAvg = data[data.length - 1]?.avg ?? 0
  const color = healthIndexChartColor(lastAvg)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={<XTick />} axisLine={false} tickLine={false} height={60} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={<YTick />} axisLine={false} tickLine={false} />
        <ReferenceLine y={37} stroke="var(--status-warning)" strokeDasharray="4 4" strokeOpacity={0.6} />
        <ReferenceLine y={62} stroke="var(--status-success)" strokeDasharray="4 4" strokeOpacity={0.4} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="avg" stroke={color} strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
