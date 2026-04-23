"use client"

import { ScoreDistributionBar } from "@/app/(tenant)/surveys/[dispatchId]/components/dispatch-charts"
import { toHealthIndex, healthIndexAccent } from "@/libs/utils/health-index"

interface QuestionDistDisplay {
  questionId: string
  questionText: string
  questionOrder: number
  scoreDirection: "higher_is_better" | "lower_is_better"
  distribution: { score: number; count: number }[]
  storedHealthIndex?: number
}

interface Props {
  distributions: QuestionDistDisplay[]
}

function calcNormalizedAvgScore(
  distribution: { score: number; count: number }[],
  scoreDirection: "higher_is_better" | "lower_is_better",
): number | null {
  const total = distribution.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null
  const weighted = distribution.reduce((s, d) => {
    const normalizedScore = scoreDirection === "lower_is_better" ? 6 - d.score : d.score
    return s + normalizedScore * d.count
  }, 0)
  return weighted / total
}

function resolveQuestionHealthIndex(d: QuestionDistDisplay): number | null {
  if (d.storedHealthIndex !== undefined) return d.storedHealthIndex
  const avg = calcNormalizedAvgScore(d.distribution, d.scoreDirection)
  return avg !== null ? toHealthIndex(avg) : null
}

export function PgrScoreDistributionWidget({ distributions }: Props): React.ReactElement {
  const nonEmpty = distributions.filter((d) => d.distribution.some((s) => s.count > 0))

  if (nonEmpty.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Sem dados de distribuição para este período.</p>
  }

  const allHIs = nonEmpty.map(resolveQuestionHealthIndex).filter((a): a is number => a !== null)
  const globalHI = allHIs.length > 0 ? Math.round(allHIs.reduce((s, a) => s + a, 0) / allHIs.length) : null

  return (
    <div>
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Distribuição de notas</p>
        {globalHI !== null && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-[9px] text-muted-foreground">Índice de Saúde:</span>
            <p className={`text-sm font-black ${healthIndexAccent(globalHI)}`}>{globalHI}%</p>
          </div>
        )}
      </div>
      <div className="divide-y divide-border">
        {nonEmpty.map((d) => {
          const hi = resolveQuestionHealthIndex(d)
          const compat = {
            id: d.questionId,
            text: d.questionText,
            order: d.questionOrder,
            scoreDirection: d.scoreDirection,
            avgScore: calcNormalizedAvgScore(d.distribution, d.scoreDirection),
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
                    <p className={`text-xl font-black ${healthIndexAccent(hi)}`}>{hi}%</p>
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

export type { QuestionDistDisplay }
