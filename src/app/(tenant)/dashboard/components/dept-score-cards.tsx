"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { DeptCard } from "@/modules/dashboard/dashboard.service"
import { healthIndexAccent, healthIndexBarColor } from "@/libs/utils/health-index"

function ScoreBar({ score }: { score: number }): React.ReactElement {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${healthIndexBarColor(score)} transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
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
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Índice de Saúde</p>
                <span className={`text-3xl font-black ${healthIndexAccent(card.avg)}`}>{card.avg}%</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                {card.prevAvg !== null && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendTextColor(card.trend)}`}>
                    {card.trend === "up" && <TrendingUp className="w-3 h-3" />}
                    {card.trend === "down" && <TrendingDown className="w-3 h-3" />}
                    {card.trend === "stable" && <Minus className="w-3 h-3" />}
                    {card.trend !== "stable" && `${card.trendDelta > 0 ? "+" : ""}${card.trendDelta}pp`}
                  </span>
                )}
              </div>
            </div>

            <ScoreBar score={card.avg} />

            {card.prevAvg !== null && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Anterior: {card.prevAvg}%
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
