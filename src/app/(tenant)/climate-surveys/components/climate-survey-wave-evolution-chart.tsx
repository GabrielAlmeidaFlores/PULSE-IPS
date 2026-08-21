"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts"
import type { ClimateSurveyWaveEvolutionPoint } from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  points: ClimateSurveyWaveEvolutionPoint[]
  corporateGoalPercent: number
}

interface EvolutionTooltipPayload {
  name: string
  value: number
  color: string
}

interface EvolutionTooltipProps {
  active?: boolean
  label?: string
  payload?: EvolutionTooltipPayload[]
}

function EvolutionTooltip({ active, label, payload }: EvolutionTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="text-muted-foreground">
          {item.name}: <span className="font-bold text-foreground">{item.value}{item.name === "eNPS" ? "" : "%"}</span>
        </p>
      ))}
    </div>
  )
}

export function ClimateSurveyWaveEvolutionChart({ points, corporateGoalPercent }: Props): React.ReactElement {
  if (points.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-10">Ainda não há ondas suficientes para evolução.</p>
  }

  const data = points.map((point) => ({
    label: point.label,
    favorabilidade: point.favorabilityPercent,
    adesao: point.adherencePercent,
    clima: point.overallScorePercent,
    eNPS: point.enps,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[-100, 100]} />
        <ReferenceLine y={corporateGoalPercent} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        <Tooltip content={<EvolutionTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="clima" name="Clima" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
        <Line type="monotone" dataKey="favorabilidade" name="Favorabilidade" stroke="var(--status-success)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
        <Line type="monotone" dataKey="adesao" name="Adesão" stroke="var(--status-info)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
        <Line type="monotone" dataKey="eNPS" name="eNPS" stroke="var(--status-warning)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
