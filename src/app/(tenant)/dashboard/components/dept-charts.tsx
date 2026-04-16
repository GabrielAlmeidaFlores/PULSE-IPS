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

export const CHART_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
]

function scoreBarColor(avg: number): string {
  if (avg >= 3.5) return "#16a34a"
  if (avg >= 2.5) return "#d97706"
  return "#dc2626"
}

function adherenceBarColor(adherence: number): string {
  if (adherence >= 70) return "#16a34a"
  if (adherence >= 50) return "#d97706"
  return "#dc2626"
}

const MUTED_FG = "hsl(var(--muted-foreground))"

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
  const metricLabel = isAvg ? "Score médio" : "Adesão"
  const precision = isAvg ? 2 : 1
  const suffix = item.name === "adherence" ? "%" : ""
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
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal vertical={false} />
        <XAxis
          dataKey="dept"
          tick={{ fontSize: 10, fill: MUTED_FG }}
          axisLine={false}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: MUTED_FG }} axisLine={false} tickLine={false} />
        <Tooltip content={<DeptBarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey="avg" radius={[3, 3, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.dept} fill={scoreBarColor(entry.avg ?? 0)} />
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
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fontSize: 10, fill: MUTED_FG }}
          axisLine={false}
          tickLine={false}
          unit="%"
        />
        <YAxis
          dataKey="dept"
          type="category"
          tick={{ fontSize: 10, fill: MUTED_FG }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip content={<DeptBarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
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
          <span className="font-bold text-foreground">{typeof item.value === "number" ? item.value.toFixed(2) : item.value}</span>
        </p>
      ))}
    </div>
  )
}

export function DeptMultiLineChart({ data, deptNames }: MultiLineProps): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED_FG }} axisLine={false} tickLine={false} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: MUTED_FG }} axisLine={false} tickLine={false} />
        <Tooltip content={<LineTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
        {deptNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={CHART_PALETTE[i % CHART_PALETTE.length] ?? "#2563eb"}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 0, fill: CHART_PALETTE[i % CHART_PALETTE.length] ?? "#2563eb" }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
