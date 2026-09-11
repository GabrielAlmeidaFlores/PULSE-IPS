"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import type { ClimateSurveyTopicComparison } from "@/modules/climate-surveys/climate-survey-comparison.service"

interface Props {
  topics: ClimateSurveyTopicComparison[]
  baseLabel: string
  compareLabel: string
  goalPercent: number
}

interface ComparisonTooltipPayload {
  name: string
  value: number | null
  dataKey: string
}

interface ComparisonTooltipProps {
  active?: boolean
  payload?: ComparisonTooltipPayload[]
  label?: string
}

function ComparisonTooltip({ active, payload, label }: ComparisonTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-muted-foreground">
          {entry.name}: <span className="font-bold text-foreground">{entry.value === null ? "—" : `${entry.value}%`}</span>
        </p>
      ))}
    </div>
  )
}

export function ClimateSurveyWaveComparisonChart({ topics, baseLabel, compareLabel, goalPercent }: Props): React.ReactElement {
  const data = topics.filter((topic) => topic.baseValue !== null || topic.compareValue !== null)

  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Sem tópicos comparáveis.</p>
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 52)}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 44, left: 8, bottom: 8 }} barGap={2} barCategoryGap="28%">
            <XAxis
              type="number"
              domain={[0, 100]}
              tickCount={6}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              width={150}
            />
            <Tooltip content={<ComparisonTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={goalPercent} stroke="var(--status-warning)" strokeDasharray="4 4" />
            <Bar dataKey="baseValue" name={baseLabel} fill="var(--muted-foreground)" maxBarSize={12} radius={0} />
            <Bar dataKey="compareValue" name={compareLabel} fill="var(--primary)" maxBarSize={12} radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
