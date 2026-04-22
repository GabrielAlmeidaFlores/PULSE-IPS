"use client"

import { ScoreDistributionBar } from "@/app/(tenant)/surveys/[dispatchId]/components/dispatch-charts"
import { toHealthIndex, healthIndexAccent } from "@/libs/utils/health-index"
import type { PgrScoreDistribution } from "@/modules/pgr/pgr.types"

interface QuestionDistDisplay {
  questionId: string
  questionText: string
  questionOrder: number
  scoreDirection: "higher_is_better" | "lower_is_better"
  distribution: { score: number; count: number }[]
}

interface Props {
  distributions: QuestionDistDisplay[]
}

function calcAvgScore(distribution: { score: number; count: number }[]): number | null {
  const total = distribution.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null
  const weighted = distribution.reduce((s, d) => s + d.score * d.count, 0)
  return weighted / total
}

function hiAccent(avg: number | null): string {
  if (avg === null) return "text-muted-foreground"
  return healthIndexAccent(toHealthIndex(avg))
}

export function PgrScoreDistributionWidget({ distributions }: Props): React.ReactElement {
  const nonEmpty = distributions.filter((d) => d.distribution.some((s) => s.count > 0))

  if (nonEmpty.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Sem dados de distribuição para este período.</p>
  }

  const allAvgs = nonEmpty.map((d) => calcAvgScore(d.distribution)).filter((a): a is number => a !== null)
  const globalAvgRaw = allAvgs.length > 0 ? allAvgs.reduce((s, a) => s + a, 0) / allAvgs.length : null
  const globalHI = globalAvgRaw !== null ? toHealthIndex(globalAvgRaw) : null

  return (
    <div>
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Distribuição de notas</p>
        {globalHI !== null && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-[9px] text-muted-foreground">Índice de Saúde:</span>
            <p className={`text-sm font-black ${hiAccent(globalAvgRaw)}`}>{globalHI}%</p>
          </div>
        )}
      </div>
      <div className="divide-y divide-border">
        {nonEmpty.map((d) => {
          const avgScore = calcAvgScore(d.distribution)
          const hi = avgScore !== null ? toHealthIndex(avgScore) : null
          const compat = {
            id: d.questionId,
            text: d.questionText,
            order: d.questionOrder,
            scoreDirection: d.scoreDirection,
            avgScore,
            distribution: d.distribution,
          }
          return (
            <div key={d.questionId} className="px-5 py-4 grid grid-cols-1 md:grid-cols-[260px_1fr_80px] gap-3 items-center">
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-black text-muted-foreground shrink-0 mt-0.5 w-6">P{d.questionOrder}</span>
                <div className="space-y-1">
                  <p className="text-xs text-foreground leading-relaxed">{d.questionText}</p>
                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 ${
                    d.scoreDirection === "lower_is_better"
                      ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                      : "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  }`}>
                    {d.scoreDirection === "lower_is_better" ? "1 = bom · 5 = ruim" : "1 = ruim · 5 = bom"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <ScoreDistributionBar question={compat} />
                <div className="flex gap-1 flex-wrap">
                  {d.distribution.filter((s) => s.count > 0).map((s) => (
                    <span key={s.score} className="text-[9px] text-muted-foreground">
                      {s.score}★ {s.count}x
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                {hi !== null ? (
                  <>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Índice de Saúde</p>
                    <p className={`text-xl font-black ${hiAccent(avgScore)}`}>{hi}%</p>
                  </>
                ) : (
                  <p className="text-xl font-black text-muted-foreground">—</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { PgrScoreDistribution as PgrScoreDistributionData, QuestionDistDisplay }
