"use client"

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import type { ClimateSurveyTopicRadarPoint } from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  points: ClimateSurveyTopicRadarPoint[]
  corporateGoalPercent: number
}

interface RadarTooltipPayload {
  payload: {
    topic: string
    atual: number | null
    meta: number
  }
}

interface RadarTooltipProps {
  active?: boolean
  payload?: RadarTooltipPayload[]
}

function RadarTooltip({ active, payload }: RadarTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg max-w-xs">
      <p className="font-bold text-foreground mb-1">{item.payload.topic}</p>
      <p className="text-muted-foreground">
        Atual: <span className="font-bold text-foreground">{item.payload.atual ?? "—"}{item.payload.atual !== null ? "%" : ""}</span>
      </p>
      <p className="text-muted-foreground">
        Meta: <span className="font-bold text-foreground">{item.payload.meta}%</span>
      </p>
    </div>
  )
}

export function ClimateSurveyTopicRadarChart({ points, corporateGoalPercent }: Props): React.ReactElement {
  const data = points.map((point) => ({
    topic: point.label,
    shortLabel: point.label.length > 22 ? `${point.label.slice(0, 20)}…` : point.label,
    atual: point.scorePercent,
    meta: corporateGoalPercent,
  }))

  const hasData = data.some((row) => row.atual !== null)
  if (!hasData) {
    return <p className="text-xs text-muted-foreground text-center py-10">Sem dados suficientes para o radar de tópicos.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="shortLabel" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={5} />
        <Radar name="Meta corporativa" dataKey="meta" stroke="var(--muted-foreground)" fill="var(--muted)" fillOpacity={0.15} />
        <Radar name="Resultado atual" dataKey="atual" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip content={<RadarTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
