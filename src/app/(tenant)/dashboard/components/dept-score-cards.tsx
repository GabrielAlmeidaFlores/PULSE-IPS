"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { DeptCard } from "@/modules/dashboard/dashboard.service"

function scoreBadgeColor(score: number): string {
  if (score >= 3.5) return "text-green-600 bg-green-50 border-green-200"
  if (score >= 2.5) return "text-yellow-600 bg-yellow-50 border-yellow-200"
  return "text-red-600 bg-red-50 border-red-200"
}

function scoreBadgeLabel(score: number): string {
  if (score >= 3.5) return "Saudável"
  if (score >= 2.5) return "Atenção"
  return "Crítico"
}

function ScoreBadge({ score }: { score: number }): React.ReactElement {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${scoreBadgeColor(score)}`}>
      {scoreBadgeLabel(score)}
    </span>
  )
}

function scoreBarColor(score: number): string {
  if (score >= 3.5) return "bg-green-500"
  if (score >= 2.5) return "bg-yellow-500"
  return "bg-red-500"
}

function ScoreBar({ score }: { score: number }): React.ReactElement {
  const pct = Math.round(((score - 1) / 4) * 100)
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${scoreBarColor(score)} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function trendTextColor(trend: DeptCard["trend"]): string {
  if (trend === "up") return "text-green-600"
  if (trend === "down") return "text-red-500"
  return "text-muted-foreground"
}

interface Props {
  cards: DeptCard[]
}

export function DeptScoreCards({ cards }: Props): React.ReactElement {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-0 border border-border">
      {cards.map((card, i) => {
        const isLast = i === cards.length - 1
        const borderR = cards.length > 1 && !isLast ? "border-r border-border" : ""

        return (
          <div key={card.deptId} className={`px-4 py-4 bg-card ${borderR}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 truncate">{card.dept}</p>

            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-black text-foreground">{card.avg.toFixed(1)}</span>
              <div className="flex flex-col items-end gap-1">
                <ScoreBadge score={card.avg} />
                {card.prevAvg !== null && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendTextColor(card.trend)}`}>
                    {card.trend === "up" && <TrendingUp className="w-3 h-3" />}
                    {card.trend === "down" && <TrendingDown className="w-3 h-3" />}
                    {card.trend === "stable" && <Minus className="w-3 h-3" />}
                    {card.trend !== "stable" && `${card.trendDelta > 0 ? "+" : ""}${card.trendDelta.toFixed(2)}`}
                  </span>
                )}
              </div>
            </div>

            <ScoreBar score={card.avg} />

            {card.prevAvg !== null && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Anterior: {card.prevAvg.toFixed(2)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
