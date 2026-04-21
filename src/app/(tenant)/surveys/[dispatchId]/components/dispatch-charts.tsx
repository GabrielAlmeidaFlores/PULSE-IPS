"use client"

import { useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area,
  ReferenceDot,
} from "recharts"
import type { DispatchDashboardStats, ScoreDirection } from "@/modules/surveys/survey.types"
import { toHealthIndex, healthIndexChartColor } from "@/libs/utils/health-index"
import { ScoreSegmentTooltip, type ScoreSegmentTooltipProps } from "@/components/score-segment-tooltip"

const SCORE_COLORS_NORMAL: Record<number, string> = {
  1: "#dc2626",
  2: "#f97316",
  3: "#d97706",
  4: "#65a30d",
  5: "#16a34a",
}

const SCORE_COLORS_INVERTED: Record<number, string> = {
  1: "#16a34a",
  2: "#65a30d",
  3: "#d97706",
  4: "#f97316",
  5: "#dc2626",
}

interface QuestionTooltipPayload {
  value: number
  payload: { text: string; healthIndex: number; scoreDirection: ScoreDirection }
}

interface QuestionTooltipProps {
  active?: boolean
  payload?: QuestionTooltipPayload[]
}

const DIRECTION_LABELS: Record<ScoreDirection, string> = {
  higher_is_better: "1 = ruim · 5 = bom",
  lower_is_better: "1 = bom · 5 = ruim",
}

function QuestionTooltip({ active, payload }: QuestionTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg max-w-xs">
      <p className="font-bold text-foreground mb-1 break-words">{item.payload.text}</p>
      <p className="text-muted-foreground">Índice de Saúde: <span className="font-bold text-foreground">{item.payload.healthIndex}%</span></p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{DIRECTION_LABELS[item.payload.scoreDirection]}</p>
    </div>
  )
}

interface Props {
  stats: DispatchDashboardStats
}

export function QuestionScoreChart({ stats }: Props): React.ReactElement {
  const data = stats.questions
    .filter((q) => q.avgScore !== null)
    .map((q) => {
      const normalizedAvg = q.avgScore ?? 0
      const hi = toHealthIndex(normalizedAvg)
      return {
        name: `P${q.order}`,
        text: q.text,
        avg: hi,
        healthIndex: hi,
        scoreDirection: q.scoreDirection,
      }
    })

  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Nenhuma resposta ainda.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" domain={[0, 100]} tickCount={6} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} width={28} />
        <Tooltip content={<QuestionTooltip />} />
        <Bar dataKey="avg" radius={0} maxBarSize={20} label={{ position: "right", fontSize: 10, fontWeight: 700, formatter: (v: unknown) => (typeof v === "number" ? `${v}%` : "") }}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={healthIndexChartColor(entry.healthIndex)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

interface DistributionProps {
  question: DispatchDashboardStats["questions"][number]
}

interface SegmentTooltipState extends Omit<ScoreSegmentTooltipProps, "top" | "left"> {
  top: number
  left: number
}

export function ScoreDistributionBar({ question }: DistributionProps): React.ReactElement {
  const [tooltip, setTooltip] = useState<SegmentTooltipState | null>(null)

  const total = question.distribution.reduce((s, d) => s + d.count, 0)
  const colorMap = question.scoreDirection === "lower_is_better" ? SCORE_COLORS_INVERTED : SCORE_COLORS_NORMAL
  if (total === 0) {
    return <p className="text-xs text-muted-foreground">Sem respostas</p>
  }

  return (
    <div className="relative">
      <div className="flex gap-0.5 h-5 w-full overflow-hidden">
        {question.distribution.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0
          if (pct === 0) return null
          return (
            <div
              key={d.score}
              style={{ width: `${pct}%`, backgroundColor: colorMap[d.score] ?? "#94a3b8" }}
              className="flex items-center justify-center text-[9px] font-bold text-white transition-all cursor-default"
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setTooltip({
                  score: d.score,
                  count: d.count,
                  pct,
                  total,
                  scoreDirection: question.scoreDirection,
                  top: rect.bottom + 6,
                  left: Math.min(rect.left, window.innerWidth - 260 - 8),
                })
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {pct > 8 ? d.score : ""}
            </div>
          )
        })}
      </div>

      {tooltip !== null && <ScoreSegmentTooltip {...tooltip} />}
    </div>
  )
}

interface AdherenceGaugeProps {
  rate: number
}

function gaugeColor(rate: number): string {
  if (rate >= 0.8) return "#16a34a"
  if (rate >= 0.5) return "#d97706"
  return "#dc2626"
}

export function AdherenceGauge({ rate }: AdherenceGaugeProps): React.ReactElement {
  const pct = Math.round(rate * 100)
  const color = gaugeColor(rate)
  const data = [{ name: "rate", value: pct, fill: color }]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-14 overflow-hidden">
        <ResponsiveContainer width="100%" height={112}>
          <RadialBarChart
            cx="50%"
            cy="100%"
            innerRadius="60%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            data={data}
          >
            <RadialBar dataKey="value" cornerRadius={0} background={{ fill: "var(--muted)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-2xl font-black -mt-2" style={{ color }}>{pct}%</p>
    </div>
  )
}

export interface TrendPoint {
  date: string
  adherence: number
  dispatchId: string
}

interface DeptTrendChartProps {
  data: TrendPoint[]
  currentId: string
}

interface TrendTooltipPayload {
  value: number
  payload: TrendPoint
}

interface TrendTooltipProps {
  active?: boolean
  payload?: TrendTooltipPayload[]
}

function TrendTooltip({ active, payload }: TrendTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-0.5">{item.payload.date}</p>
      <p className="font-bold text-foreground">Adesão: {item.value}%</p>
    </div>
  )
}

export function DeptTrendChart({ data, currentId }: DeptTrendChartProps): React.ReactElement {
  if (data.length < 2) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        Histórico insuficiente — são necessários ao menos 2 disparos para exibir a tendência.
      </p>
    )
  }

  const currentPoint = data.find((d) => d.dispatchId === currentId)

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip content={<TrendTooltip />} />
        <Area
          type="monotone"
          dataKey="adherence"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#trendGrad)"
          dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
        {currentPoint !== undefined && (
          <ReferenceDot
            x={currentPoint.date}
            y={currentPoint.adherence}
            r={6}
            fill="var(--primary)"
            stroke="var(--background)"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}

