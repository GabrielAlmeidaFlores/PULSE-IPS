"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { DeptCard } from "@/modules/dashboard/dashboard.service"
import { healthIndexAccent, healthIndexBarColor, trendDirectionTextColor } from "@/libs/utils/health-index"
import { DeptHealthSummaryDrawer } from "@/app/(tenant)/dashboard/components/dept-health-summary-drawer"

function ScoreBar({ score }: { score: number }): React.ReactElement {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${healthIndexBarColor(score)} transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
    </div>
  )
}

interface Props {
  cards: DeptCard[]
}

export function DeptScoreCards({ cards }: Props): React.ReactElement {
  const [selectedCard, setSelectedCard] = useState<DeptCard | null>(null)

  return (
    <>
      <div className="flex flex-wrap gap-px bg-border border border-border overflow-hidden">
        {cards.map((card) => (
          <button
            key={card.deptId}
            type="button"
            onClick={() => setSelectedCard(card)}
            className="flex-1 min-w-[180px] px-4 py-4 bg-card text-left hover:bg-muted/40 transition-colors cursor-pointer group"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 truncate group-hover:text-foreground transition-colors">{card.dept}</p>

            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Índice de Saúde</p>
                <span className={`text-3xl font-black ${healthIndexAccent(card.avg)}`}>{card.avg}%</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                {card.prevAvg !== null && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendDirectionTextColor(card.trend)}`}>
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
          </button>
        ))}
      </div>

      <DeptHealthSummaryDrawer
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </>
  )
}
