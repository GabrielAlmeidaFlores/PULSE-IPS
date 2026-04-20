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
  ReferenceLine,
} from "recharts"

import type { ScoreDirection } from "@/modules/surveys/survey.types"

export interface DeptOverviewData {
  id: string
  name: string
  avgScore: number
  adherencePct: number
  responseCount: number
  totalRecipients: number
  employeeCount: number
}

export interface QuestionChartData {
  id: string
  text: string
  avgScore: number
  scoreDirection: ScoreDirection
  order: number
  responseCount: number
}

const TICK_COLOR = "#94a3b8"
const LABEL_MAX_LEN = 18

function scoreColor(normalizedAvg: number): string {
  if (normalizedAvg >= 3.5) return "#16a34a"
  if (normalizedAvg >= 2.5) return "#d97706"
  if (normalizedAvg > 0) return "#dc2626"
  return "#94a3b8"
}

function rawAvg(normalizedAvg: number, direction: ScoreDirection): number {
  return direction === "lower_is_better" ? 6 - normalizedAvg : normalizedAvg
}

const DIRECTION_LABELS: Record<ScoreDirection, string> = {
  higher_is_better: "1 = ruim · 5 = bom",
  lower_is_better: "1 = bom · 5 = ruim",
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

interface ScoreTooltipPayload {
  value: number
  payload: DeptOverviewData
}
interface ScoreTooltipProps { active?: boolean; payload?: ScoreTooltipPayload[] }

function ScoreTooltip({ active, payload }: ScoreTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg space-y-1 min-w-[160px]">
      <p className="font-bold text-foreground">{item.payload.name}</p>
      <p className="text-muted-foreground">
        Score: <span className="font-bold" style={{ color: scoreColor(item.value) }}>{item.value.toFixed(2)}</span>
      </p>
      <p className="text-muted-foreground">
        Adesão: <span className="font-bold text-foreground">{item.payload.adherencePct}%</span>
      </p>
      <p className="text-muted-foreground">
        {item.payload.responseCount}/{item.payload.totalRecipients} respostas
      </p>
    </div>
  )
}

interface AdherenceTooltipPayload {
  value: number
  payload: DeptOverviewData
}
interface AdherenceTooltipProps { active?: boolean; payload?: AdherenceTooltipPayload[] }

function AdherenceTooltip({ active, payload }: AdherenceTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg space-y-1 min-w-[160px]">
      <p className="font-bold text-foreground">{item.payload.name}</p>
      <p className="text-muted-foreground">
        Adesão: <span className="font-bold text-foreground">{item.value}%</span>
      </p>
      <p className="text-muted-foreground">
        {item.payload.responseCount}/{item.payload.totalRecipients} respostas
      </p>
    </div>
  )
}

interface QuestionTooltipPayload {
  value: number
  payload: QuestionChartData & { label: string; rawScore: number }
}
interface QuestionTooltipProps { active?: boolean; payload?: QuestionTooltipPayload[] }

function QuestionTooltip({ active, payload }: QuestionTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg max-w-[260px] space-y-1">
      <p className="font-bold text-foreground break-words leading-snug">{item.payload.text}</p>
      <p className="text-muted-foreground">
        Média: <span className="font-bold" style={{ color: scoreColor(item.payload.avgScore) }}>{item.payload.rawScore.toFixed(2)}</span>
      </p>
      <p className="text-[10px] text-muted-foreground">{DIRECTION_LABELS[item.payload.scoreDirection] ?? ""}</p>
      <p className="text-muted-foreground">{item.payload.responseCount} respostas</p>
    </div>
  )
}

interface PgrScoreComparisonChartProps { depts: DeptOverviewData[] }
interface PgrAdherenceComparisonChartProps { depts: DeptOverviewData[] }
interface PgrDeptQuestionsChartProps { questions: QuestionChartData[] }

export function PgrScoreComparisonChart({ depts }: PgrScoreComparisonChartProps): React.ReactElement {
  if (depts.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Nenhum dado disponível.</p>
  }
  const data = [...depts]
    .sort((a, b) => b.avgScore - a.avgScore)
    .map((d) => ({ ...d, label: truncate(d.name, LABEL_MAX_LEN) }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, depts.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          domain={[0, 5]}
          tickCount={6}
          tick={{ fontSize: 10, fill: TICK_COLOR }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: TICK_COLOR }}
          tickLine={false}
          axisLine={false}
          width={104}
        />
        <Tooltip content={<ScoreTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <ReferenceLine x={3.5} stroke="#16a34a" strokeDasharray="4 3" strokeWidth={1} opacity={0.5} />
        <ReferenceLine x={2.5} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1} opacity={0.5} />
        <Bar dataKey="avgScore" radius={[0, 3, 3, 0]} barSize={18} stroke="none" label={{ position: "right", fontSize: 10, fontWeight: 700, formatter: (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v)) }}>
          {data.map((d) => (
            <Cell key={d.id} fill={scoreColor(d.avgScore)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PgrAdherenceComparisonChart({ depts }: PgrAdherenceComparisonChartProps): React.ReactElement {
  if (depts.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Nenhum dado disponível.</p>
  }
  const data = [...depts]
    .sort((a, b) => b.adherencePct - a.adherencePct)
    .map((d) => ({ ...d, label: truncate(d.name, LABEL_MAX_LEN) }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, depts.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickCount={6}
          tickFormatter={(v: unknown) => `${v}%`}
          tick={{ fontSize: 10, fill: TICK_COLOR }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: TICK_COLOR }}
          tickLine={false}
          axisLine={false}
          width={104}
        />
        <Tooltip content={<AdherenceTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <ReferenceLine x={80} stroke="#16a34a" strokeDasharray="4 3" strokeWidth={1} opacity={0.5} />
        <Bar
          dataKey="adherencePct"
          radius={[0, 3, 3, 0]}
          barSize={18}
          stroke="none"
          label={{ position: "right", fontSize: 10, fontWeight: 700, formatter: (v: unknown) => (typeof v === "number" ? `${v}%` : String(v)) }}
        >
          {data.map((d) => {
            const fill = (() => {
              if (d.adherencePct >= 80) return "#16a34a"
              if (d.adherencePct >= 50) return "#d97706"
              return "#dc2626"
            })()
            return <Cell key={d.id} fill={fill} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PgrDeptQuestionsChart({ questions }: PgrDeptQuestionsChartProps): React.ReactElement {
  if (questions.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Nenhuma pergunta disponível.</p>
  }
  const data = [...questions]
    .sort((a, b) => a.order - b.order)
    .map((q) => ({
      ...q,
      label: `P${q.order}`,
      rawScore: rawAvg(q.avgScore, q.scoreDirection),
    }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, questions.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          domain={[0, 5]}
          tickCount={6}
          tick={{ fontSize: 10, fill: TICK_COLOR }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fontWeight: 600, fill: TICK_COLOR }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip content={<QuestionTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <ReferenceLine x={3.5} stroke="#16a34a" strokeDasharray="4 3" strokeWidth={1} opacity={0.5} />
        <ReferenceLine x={2.5} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1} opacity={0.5} />
        <Bar dataKey="avgScore" radius={[0, 3, 3, 0]} barSize={16} stroke="none" label={{ position: "right", fontSize: 10, fontWeight: 700, formatter: (v: unknown) => (typeof v === "number" ? v.toFixed(1) : String(v)) }}>
          {data.map((q) => (
            <Cell key={q.id} fill={scoreColor(q.avgScore)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
