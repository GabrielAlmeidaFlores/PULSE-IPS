"use client"

import React, { useTransition } from "react"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { getDeptHealthSummaryAction } from "@/app/(tenant)/dashboard/actions"
import { healthIndexLabel, healthIndexAccent, healthIndexBarColor } from "@/libs/utils/health-index"
import { BADGE_BASE, BADGE_DEFAULT, SEVERITY_LABELS, SEVERITY_STYLE, SEVERITY_DOT, TYPE_LABELS } from "@/libs/design-system/alert-labels"
import type { DeptCard, DeptHealthSummary } from "@/modules/dashboard/dashboard.service"

function adherenceTextColor(rate: number): string {
  if (rate >= 80) return "text-green-600"
  if (rate >= 50) return "text-yellow-600"
  return "text-red-600"
}

function adherenceBarColor(rate: number): string {
  if (rate >= 80) return "bg-green-500"
  if (rate >= 50) return "bg-yellow-500"
  return "bg-red-500"
}

function trendIcon(trend: DeptCard["trend"]): React.ReactElement {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-600" />
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />
}

function trendLabel(trend: DeptCard["trend"], delta: number): string {
  if (trend === "stable") return "Estável"
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta}pp em relação ao mês anterior`
}

function healthStatusDescription(avg: number): string {
  if (avg >= 62) return "O setor está com índice de saúde dentro do esperado. Continue monitorando para manter o resultado."
  if (avg >= 37) return "Há sinais de atenção. Algumas áreas estão abaixo do ideal — verifique as perguntas com menor pontuação e os alertas ativos."
  if (avg > 0) return "O setor está em situação crítica. Queda expressiva no bem-estar — recomenda-se ação imediata com um plano de melhoria."
  return "Dados insuficientes para avaliar o índice de saúde deste setor no período atual (mínimo de 5 respostas necessário)."
}

interface DeptHealthSummaryDrawerProps {
  card: DeptCard | null
  onClose: () => void
}

export function DeptHealthSummaryDrawer({ card, onClose }: DeptHealthSummaryDrawerProps): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [summary, setSummary] = React.useState<DeptHealthSummary | null>(null)
  const [loadedDeptId, setLoadedDeptId] = React.useState<string | null>(null)
  const [fetchError, setFetchError] = React.useState<string | null>(null)

  const isOpen = card !== null

  React.useEffect(() => {
    if (!card) {
      setSummary(null)
      setLoadedDeptId(null)
      setFetchError(null)
      return
    }
    if (card.deptId === loadedDeptId) return

    setFetchError(null)
    setSummary(null)
    startTransition(async () => {
      const result = await getDeptHealthSummaryAction(card.deptId)
      if (result.error ?? !result.data) {
        setFetchError(result.error ?? "Erro ao carregar dados.")
        return
      }
      setSummary(result.data)
      setLoadedDeptId(card.deptId)
    })
  }, [card, loadedDeptId])

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto p-0 gap-0">
        {card && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4 bg-card gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resumo do setor</p>
              <SheetTitle className="text-base font-bold text-foreground">{card.dept}</SheetTitle>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-2xl font-black ${healthIndexAccent(card.avg)}`}>{card.avg}%</span>
                <div>
                  <span className={`text-xs font-bold ${healthIndexAccent(card.avg)}`}>{healthIndexLabel(card.avg)}</span>
                  {card.prevAvg !== null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {trendIcon(card.trend)}
                      <span className="text-[11px] text-muted-foreground">{trendLabel(card.trend, card.trendDelta)}</span>
                    </div>
                  )}
                </div>
              </div>
              <SheetDescription className="text-[12px] text-muted-foreground leading-relaxed mt-1">
                {healthStatusDescription(card.avg)}
              </SheetDescription>
            </SheetHeader>

            <div className="px-5 py-4 space-y-5">
              {isPending && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Carregando dados...</span>
                </div>
              )}

              {fetchError && !isPending && (
                <p className="text-xs text-destructive">{fetchError}</p>
              )}

              {summary && !isPending && (
                <>
                  <section>
                    <div className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score por área</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Média das respostas recebidas nos últimos 30 dias.</p>
                    </div>
                    {summary.questionScores.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Dados insuficientes para detalhar por pergunta neste período.</p>
                    ) : (
                      <div className="space-y-3">
                        {summary.questionScores.map((q) => (
                          <div key={q.questionText}>
                            <div className="flex items-start justify-between mb-1 gap-3">
                              <p className="text-xs text-foreground leading-tight flex-1">{q.questionText}</p>
                              <div className="shrink-0 text-right">
                                <span className={`text-xs font-black ${healthIndexAccent(q.healthIndex)}`}>{q.healthIndex}%</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">{q.rawAvg.toFixed(1)}/5</span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${healthIndexBarColor(q.healthIndex)} transition-all`}
                                style={{ width: `${Math.min(q.healthIndex, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Alertas ativos</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Alertas não resolvidos neste setor, de qualquer período.</p>
                    </div>
                    {summary.activeAlerts.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <p className="text-xs">Nenhum alerta ativo neste setor.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {summary.activeAlerts.map((alert, idx) => (
                          <div key={idx} className="flex items-start gap-2 border border-border bg-muted/20 px-3 py-2">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className={`${BADGE_BASE} ${SEVERITY_STYLE[alert.severity] ?? BADGE_DEFAULT}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${SEVERITY_DOT[alert.severity] ?? "bg-muted-foreground"}`} />
                                  {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[alert.type] ?? alert.type}</span>
                              </div>
                              <p className="text-xs text-foreground">{alert.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Total de respostas recebidas nos últimos 30 dias, sobre todos os disparos realizados no período.</p>
                    </div>
                    {summary.adherenceRate === null ? (
                      <p className="text-xs text-muted-foreground">Nenhum disparo realizado no período.</p>
                    ) : (
                      <div>
                        <div className="flex items-end justify-between mb-1.5">
                          <p className="text-xs text-muted-foreground">{summary.responseCount} respostas de {summary.totalRecipients} enviados</p>
                          <span className={`text-lg font-black ${adherenceTextColor(summary.adherenceRate)}`}>
                            {summary.adherenceRate}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${adherenceBarColor(summary.adherenceRate)}`}
                            style={{ width: `${Math.min(summary.adherenceRate, 100)}%` }}
                          />
                        </div>
                        {summary.adherenceRate < 80 && (
                          <p className="text-[11px] text-muted-foreground mt-1.5">Abaixo de 80% — considere reenviar a pesquisa para os não-respondentes.</p>
                        )}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
