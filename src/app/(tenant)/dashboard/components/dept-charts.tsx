"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts"
import type { BarPoint, ChartMonthPoint } from "@/modules/dashboard/dashboard.service"
import { healthIndexChartColor } from "@/libs/utils/health-index"

export const CHART_PALETTE = [
  "#3DB98A",
  "var(--status-success)",
  "var(--status-warning)",
  "var(--status-danger)",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "var(--score-4)",
]

const CHART_TICK_FILL = "var(--muted-foreground)"

function adherenceBarColor(adherence: number): string {
  if (adherence >= 70) return "var(--status-success)"
  if (adherence >= 50) return "var(--status-warning)"
  return "var(--status-danger)"
}

interface TickProps {
  x?: number
  y?: number
  payload?: { value: unknown }
}

function XTickLabel({ x, y, payload }: TickProps): React.ReactElement {
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" style={{ fill: CHART_TICK_FILL, fontSize: 10 }}>
      {String(payload?.value ?? "")}
    </text>
  )
}

function XTickAngled({ x, y, payload }: TickProps): React.ReactElement {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" transform={`rotate(-30, ${x}, ${y})`} style={{ fill: CHART_TICK_FILL, fontSize: 10 }}>
      {String(payload?.value ?? "")}
    </text>
  )
}

function YTickPct({ x, y, payload }: TickProps): React.ReactElement {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" style={{ fill: CHART_TICK_FILL, fontSize: 10 }}>
      {`${payload?.value}%`}
    </text>
  )
}

function YTickLabel({ x, y, payload }: TickProps): React.ReactElement {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" style={{ fill: CHART_TICK_FILL, fontSize: 10 }}>
      {String(payload?.value ?? "")}
    </text>
  )
}

interface BarTooltipPayload {
  value: number
  name: string
}

interface BarTooltipProps {
  active?: boolean
  payload?: BarTooltipPayload[]
  label?: string
}

function DeptBarTooltip({ active, payload, label }: BarTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  const isAvg = item.name === "avg"
  const metricLabel = isAvg ? "Índice de Saúde" : "Adesão"
  const suffix = isAvg ? "%" : "%"
  const precision = 0
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        {metricLabel}: <span className="font-bold text-foreground">{item.value.toFixed(precision)}{suffix}</span>
      </p>
    </div>
  )
}

interface DeptComparisonProps {
  data: BarPoint[]
}

export function DeptComparisonChart({ data }: DeptComparisonProps): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 32 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal vertical={false} />
        <XAxis
          dataKey="dept"
          tick={<XTickAngled />}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={<YTickPct />} axisLine={false} tickLine={false} />
        <Tooltip content={<DeptBarTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
        <Bar dataKey="avg" radius={[3, 3, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.dept} fill={healthIndexChartColor(entry.avg ?? 0)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

interface AdherenceProps {
  data: BarPoint[]
}

export function AdherenceChart({ data }: AdherenceProps): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={<YTickPct />}
          axisLine={false}
          tickLine={false}
          unit="%"
        />
        <YAxis
          dataKey="dept"
          type="category"
          tick={<YTickLabel />}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip content={<DeptBarTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
        <Bar dataKey="adherence" radius={[0, 3, 3, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.dept} fill={adherenceBarColor(entry.adherence ?? 0)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

interface MultiLineProps {
  data: ChartMonthPoint[]
  deptNames: string[]
}

interface LineTooltipPayload {
  value: number
  name: string
  color: string
}

interface LineTooltipProps {
  active?: boolean
  payload?: LineTooltipPayload[]
  label?: string
}

function LineTooltip({ active, payload, label }: LineTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-foreground mb-1.5">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-1.5 mb-0.5">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: "inline-block" }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-bold text-foreground">{typeof item.value === "number" ? `${item.value}%` : item.value}</span>
        </p>
      ))}
    </div>
  )
}

export function DeptMultiLineChart({ data, deptNames }: MultiLineProps): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={<XTickLabel />} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={<YTickPct />} axisLine={false} tickLine={false} />
        <Tooltip content={<LineTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
        {deptNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={CHART_PALETTE[i % CHART_PALETTE.length] ?? "#3DB98A"}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 0, fill: CHART_PALETTE[i % CHART_PALETTE.length] ?? "#3DB98A" }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
