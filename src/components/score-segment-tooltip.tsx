"use client"

import type { ScoreDirection } from "@/modules/surveys/survey.types"

const SCORE_LABELS_HIGHER: Record<number, string> = {
  1: "Muito ruim",
  2: "Ruim",
  3: "Neutro",
  4: "Bom",
  5: "Muito bom",
}

const SCORE_LABELS_LOWER: Record<number, string> = {
  1: "Muito bom",
  2: "Bom",
  3: "Neutro",
  4: "Ruim",
  5: "Muito ruim",
}

const IMPACT_POSITIVE = "Esta nota eleva o Índice de Saúde do setor."
const IMPACT_NEUTRAL = "Esta nota não altera o Índice de Saúde do setor."
const IMPACT_NEGATIVE = "Esta nota reduz o Índice de Saúde do setor."

const SCORE_IMPACT: Record<number, Record<ScoreDirection, string>> = {
  1: { higher_is_better: IMPACT_NEGATIVE, lower_is_better: IMPACT_POSITIVE },
  2: { higher_is_better: IMPACT_NEGATIVE, lower_is_better: IMPACT_POSITIVE },
  3: { higher_is_better: IMPACT_NEUTRAL,  lower_is_better: IMPACT_NEUTRAL  },
  4: { higher_is_better: IMPACT_POSITIVE, lower_is_better: IMPACT_NEGATIVE },
  5: { higher_is_better: IMPACT_POSITIVE, lower_is_better: IMPACT_NEGATIVE },
}

export interface ScoreSegmentTooltipProps {
  score: number
  count: number
  pct: number
  total: number
  scoreDirection: ScoreDirection
  top: number
  left: number
}

function resolveScoreLabel(score: number, direction: ScoreDirection): string {
  const map = direction === "lower_is_better" ? SCORE_LABELS_LOWER : SCORE_LABELS_HIGHER
  return map[score] ?? `Nota ${score}`
}

function resolveImpact(score: number, direction: ScoreDirection): string {
  return SCORE_IMPACT[score]?.[direction] ?? ""
}

function buildNarrativeLine(count: number, score: number, pct: number, total: number, label: string): string {
  const pessoas = count === 1 ? "1 funcionário deu" : `${count} funcionários deram`
  const representando = `representando ${pct.toFixed(0)}% das ${total} ${total === 1 ? "resposta" : "respostas"}`
  return `${pessoas} nota ${score} (${label}), ${representando}.`
}

export function ScoreSegmentTooltip({
  score,
  count,
  pct,
  total,
  scoreDirection,
  top,
  left,
}: ScoreSegmentTooltipProps): React.ReactElement {
  const label = resolveScoreLabel(score, scoreDirection)
  const impact = resolveImpact(score, scoreDirection)
  const narrative = buildNarrativeLine(count, score, pct, total, label)

  return (
    <div
      className="fixed z-50 border border-border bg-card shadow-lg p-3 w-64 pointer-events-none"
      style={{ top, left, borderRadius: 0 }}
    >
      <p className="text-[12px] text-foreground leading-relaxed mb-2">{narrative}</p>
      <p className="text-[10px] text-muted-foreground border-t border-border pt-1.5">{impact}</p>
    </div>
  )
}
