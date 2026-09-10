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
    distancia: number | null
  }
}

interface RadarTooltipProps {
  active?: boolean
  payload?: RadarTooltipPayload[]
}

function distanceClass(distance: number | null): string {
  if (distance === null) return "text-muted-foreground"
  return distance >= 0 ? "text-status-success" : "text-status-danger"
}

function RadarTooltip({ active, payload }: RadarTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  const { atual, meta, distancia } = item.payload
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg max-w-xs">
      <p className="font-bold text-foreground mb-1">{item.payload.topic}</p>
      <p className="text-muted-foreground">
        Atual: <span className="font-bold text-foreground">{atual ?? "—"}{atual !== null ? "%" : ""}</span>
      </p>
      <p className="text-muted-foreground">
        Meta: <span className="font-bold text-foreground">{meta}%</span>
      </p>
      <p className={distanceClass(distancia)}>
        Distância da meta:{" "}
        <span className="font-bold">
          {distancia === null ? "—" : `${distancia > 0 ? "+" : ""}${distancia} p.p.`}
        </span>
      </p>
    </div>
  )
}

interface AngleTickProps {
  x?: number | string
  y?: number | string
  textAnchor?: "start" | "middle" | "end" | "inherit"
  payload?: { value?: string }
}

function wrapLabel(label: string, maxCharsPerLine: number): string[] {
  const words = label.split(" ")
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    if (current.length === 0) {
      current = word
    } else if (`${current} ${word}`.length <= maxCharsPerLine) {
      current = `${current} ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

function renderAngleTick({ x, y, textAnchor, payload }: AngleTickProps): React.ReactElement {
  const px = x ?? 0
  const py = y ?? 0
  const lines = wrapLabel(payload?.value ?? "", 16)
  return (
    <text x={px} y={py} textAnchor={textAnchor ?? "middle"} fill="var(--muted-foreground)" fontSize={10}>
      {lines.map((line, index) => (
        <tspan key={line} x={px} dy={index === 0 ? 0 : 11}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

export function ClimateSurveyTopicRadarChart({ points, corporateGoalPercent }: Props): React.ReactElement {
  const data = points.map((point) => ({
    topic: point.label,
    atual: point.scorePercent,
    meta: corporateGoalPercent,
    distancia:
      point.scorePercent === null ? null : Math.round((point.scorePercent - corporateGoalPercent) * 10) / 10,
  }))

  const hasData = data.some((row) => row.atual !== null)
  if (!hasData) {
    return <p className="text-xs text-muted-foreground text-center py-10">Sem dados suficientes para o radar de tópicos.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="68%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="topic" tick={renderAngleTick} />
        <PolarRadiusAxis angle={90} domain={[50, 100]} tick={{ fontSize: 9 }} tickCount={6} />
        <Radar
          name="Meta corporativa"
          dataKey="meta"
          stroke="var(--status-warning)"
          strokeDasharray="4 4"
          strokeWidth={2}
          fill="none"
        />
        <Radar
          name="Resultado atual"
          dataKey="atual"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="var(--primary)"
          fillOpacity={0.15}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip content={<RadarTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
