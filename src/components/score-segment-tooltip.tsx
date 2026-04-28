"use client"

import type { ScoreDirection } from "@/modules/surveys/survey.types"

export interface ScoreSegmentTooltipProps {
  score: number
  count: number
  pct: number
  total: number
  scoreDirection: ScoreDirection
  questionText: string
  top: number
  left: number
}

function buildNarrativeLine(count: number, score: number, pct: number, total: number): string {
  const pessoas = count === 1 ? "1 funcionário deu" : `${count} funcionários deram`
  const representando = `representando ${pct.toFixed(0)}% das ${total} ${total === 1 ? "resposta" : "respostas"}`
  return `${pessoas} nota ${score}, ${representando}.`
}

export function ScoreSegmentTooltip({
  score,
  count,
  pct,
  total,
  questionText,
  top,
  left,
}: ScoreSegmentTooltipProps): React.ReactElement {
  const narrative = buildNarrativeLine(count, score, pct, total)

  return (
    <div
      className="fixed z-50 border border-border bg-card shadow-lg p-3 w-64 pointer-events-none"
      style={{ top, left, borderRadius: 0 }}
    >
      <p className="text-[11px] font-bold text-foreground leading-snug mb-2">{questionText}</p>
      <p className="text-[12px] text-foreground leading-relaxed">{narrative}</p>
    </div>
  )
}
