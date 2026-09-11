"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import {
  resolveClimateSurveyFavorabilityBand,
  type ClimateSurveyTopicFavorabilityPoint,
} from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  points: ClimateSurveyTopicFavorabilityPoint[]
  goalPercent: number
}

function favorabilityBandColor(percent: number, goalPercent: number): string {
  const band = resolveClimateSurveyFavorabilityBand(percent, goalPercent)
  if (band === "at_goal") return "var(--status-success)"
  if (band === "below_goal") return "var(--status-warning)"
  return "var(--status-danger)"
}

interface FavorabilityTooltipPayload {
  value: number
  payload: { label: string }
}

interface FavorabilityTooltipProps {
  active?: boolean
  payload?: FavorabilityTooltipPayload[]
}

function FavorabilityTooltip({ active, payload }: FavorabilityTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-foreground mb-1">{item.payload.label}</p>
      <p className="text-muted-foreground">
        Favorabilidade: <span className="font-bold text-foreground">{item.value}%</span>
      </p>
    </div>
  )
}

export function ClimateSurveyTopicFavorabilityChart({ points, goalPercent }: Props): React.ReactElement {
  const data = points.filter((point) => point.favorabilityPercent !== null)

  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Nenhuma resposta ainda.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 44, left: 8, bottom: 8 }} barCategoryGap="30%">
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
          width={130}
        />
        <Tooltip content={<FavorabilityTooltip />} />
        <ReferenceLine x={goalPercent} stroke="var(--status-warning)" strokeDasharray="4 4" />
        <Bar
          dataKey="favorabilityPercent"
          radius={0}
          maxBarSize={18}
          label={{
            position: "right",
            fontSize: 10,
            fontWeight: 700,
            formatter: (v: unknown) => (typeof v === "number" ? `${v}%` : ""),
          }}
        >
          {data.map((entry) => (
            <Cell
              key={entry.dimension}
              fill={favorabilityBandColor(entry.favorabilityPercent ?? 0, goalPercent)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
