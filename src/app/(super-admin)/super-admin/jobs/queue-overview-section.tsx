"use client"

import { Fragment, useState } from "react"
import type { QueueStatus, LiveJobSummary } from "@/modules/queue-status/queue-status.types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  queue: QueueStatus
}

const PAGE_SIZE = 10

const STATUS_COLORS: Record<string, string> = {
  active:   "badge-info",
  waiting:  "badge-warning",
  delayed:  "badge-info",
  failed:   "badge-danger",
  completed:"badge-success",
  paused:   "bg-muted text-muted-foreground border-border",
}

const STATUS_LABELS: Record<string, string> = {
  active:   "Ativo",
  waiting:  "Aguardando",
  delayed:  "Agendado",
  failed:   "Falhou",
  completed:"Concluído",
  paused:   "Pausado",
}

const QUEUE_LABELS: Record<string, string> = {
  "pulse-jobs":     "Jobs Agendados",
  "pulse-messages": "Mensagens",
}

const JOB_NAME_LABELS: Record<string, string> = {
  "health-survey-dispatcher":               "Disparo de Pesquisas",
  "health-survey-adherence-checker":        "Verificador de Adesão",
  "health-survey-score-alert-detector":     "Detector de Alertas de Score",
  "employee-unpause":                "Reativação de Colaboradores",
  "pgr-review-reminder":             "Lembrete de Revisão PGR",
  "stripe-webhook-retry":            "Reprocessamento de Webhooks",
  "health-survey-response-token-cleanup":   "Limpeza de Tokens de Resposta",
  "action-plan-suggestion-generator": "Gerador de Sugestões de Plano",
  "organization-deletion-executor":  "Exclusão de Organizações",
  "send-message":                    "Envio de Mensagem",
}

const JOB_DESCRIPTIONS: Record<string, string> = {
  "health-survey-dispatcher":             "Verifica quais pesquisas devem ser disparadas agora com base na frequência configurada, cria os tokens individuais por colaborador e envia as mensagens.",
  "health-survey-adherence-checker":      "48h após cada disparo, calcula a taxa de adesão por setor. Se menos de 80% responderam, cria um alerta de baixa adesão.",
  "health-survey-score-alert-detector":   "Analisa os scores de cada setor e cria alertas de queda de score, score baixo ou tendência negativa em 3 períodos consecutivos.",
  "employee-unpause":                     "Reativa automaticamente colaboradores cujo período de pausa encerrou (pause_end_at ≤ hoje).",
  "pgr-review-reminder":                  "30 dias antes da próxima revisão agendada do PGR, cria um alerta para lembrar o time de gerar o relatório.",
  "stripe-webhook-retry":                 "Reprocessa eventos do Stripe que falharam na primeira tentativa e ainda não foram processados.",
  "health-survey-response-token-cleanup": "Remove tokens de resposta de pesquisa que já expiraram e não foram utilizados, mantendo o banco limpo.",
  "action-plan-suggestion-generator":     "Analisa as métricas de cada organização e gera sugestões automáticas de planos de ação com base em scores baixos e alertas recentes.",
  "organization-deletion-executor":       "Exclui permanentemente as organizações que agendaram exclusão de conta e cujo prazo de carência de 30 dias já encerrou.",
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function formatDurationMs(ms: number): string {
  if (ms < 1_000) return `${ms}ms`
  return `${(ms / 1_000).toFixed(1)}s`
}

function getScheduledExecuteAt(job: LiveJobSummary): number | null {
  if (job.status !== "delayed") return null
  if (job.delay !== undefined && job.delay > 0) return job.timestamp + job.delay
  const parts = job.id.split(":")
  const last = parts[parts.length - 1]
  if (last !== undefined) {
    const ts = parseInt(last, 10)
    if (!isNaN(ts) && ts > 1_000_000_000_000) return ts
  }
  return null
}

function describeCron(expression: string): string {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) return expression
  const [minute, hour, dayOfMonth, , dayOfWeek] = parts
  if (minute === undefined || hour === undefined || dayOfMonth === undefined || dayOfWeek === undefined) return expression

  if (minute.startsWith("*/") && hour === "*" && dayOfMonth === "*" && dayOfWeek === "*") {
    const interval = parseInt(minute.replace("*/", ""), 10)
    if (!isNaN(interval)) {
      if (interval === 1) return "A cada minuto"
      return `A cada ${interval} minutos`
    }
  }
  if (minute === "0" && hour === "*" && dayOfMonth === "*" && dayOfWeek === "*") return "A cada hora"
  if (hour === "*" || dayOfMonth !== "*" || dayOfWeek !== "*") return expression
  const h = parseInt(hour, 10)
  const m = parseInt(minute, 10)
  if (!isNaN(h) && !isNaN(m)) {
    const hStr = String(h).padStart(2, "0")
    const mStr = String(m).padStart(2, "0")
    return `Todos os dias às ${hStr}:${mStr}`
  }
  return expression
}

function LiveJobsTable({ jobs }: { jobs: LiveJobSummary[] }): React.ReactElement {
  const [page, setPage] = useState(1)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageJobs = jobs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const rangeStart = jobs.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, jobs.length)

  function rowKey(job: LiveJobSummary): string {
    return `${job.id}-${job.status}`
  }

  return (
    <div className="space-y-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse table-fixed">
          <colgroup>
            <col className="w-24" />
            <col className="w-44" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-24" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Adicionado em</th>
              <th className="px-3 py-2">Tentativas</th>
              <th className="px-3 py-2">Erro</th>
            </tr>
          </thead>
          <tbody>
            {pageJobs.map((job) => {
              const key = rowKey(job)
              const isExpanded = expandedKey === key
              return (                <Fragment key={key}>
                  <tr
                    className={`cursor-pointer text-xs hover:bg-muted/30 ${job.status === "failed" ? "bg-status-danger-subtle/50" : ""}`}
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onClick={() => { setExpandedKey(isExpanded ? null : key) }}
                  >
                    <td className="px-3 py-2">
                      <Badge className={`${STATUS_COLORS[job.status] ?? "bg-muted text-muted-foreground border-border"} border text-[10px] font-semibold`}>
                        {STATUS_LABELS[job.status] ?? job.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-medium truncate">{JOB_NAME_LABELS[job.name] ?? job.name}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground truncate" title={job.id}>
                      {job.id}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground truncate">
                      {(() => {
                        const executeAt = getScheduledExecuteAt(job)
                        if (executeAt !== null) return `executa ${formatTimestamp(executeAt)}`
                        return formatTimestamp(job.timestamp)
                      })()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {job.attemptsMade}/{job.maxAttempts}
                    </td>
                    <td className="px-3 py-2 text-status-danger truncate text-[11px]" title={job.failedReason}>
                      {job.failedReason ?? "—"}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td colSpan={6} className="bg-muted/20 px-4 py-3 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                          <div>
                            <span className="font-semibold text-foreground">Job ID:</span>{" "}
                            <span className="font-mono">{job.id}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Fila:</span>{" "}
                            {QUEUE_LABELS[job.queueName] ?? job.queueName}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Adicionado em:</span>{" "}
                            {formatTimestamp(job.timestamp)}
                          </div>
                          {getScheduledExecuteAt(job) !== null && (
                            <div>
                              <span className="font-semibold text-foreground">Executa em:</span>{" "}
                              {formatTimestamp(getScheduledExecuteAt(job) as number)}
                            </div>
                          )}
                          {job.processedOn !== undefined && (
                            <div>
                              <span className="font-semibold text-foreground">Processando desde:</span>{" "}
                              {formatTimestamp(job.processedOn)}
                            </div>
                          )}
                          {job.delay !== undefined && job.delay > 0 && (
                            <div>
                              <span className="font-semibold text-foreground">Delay:</span>{" "}
                              {formatDurationMs(job.delay)}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-foreground">Tentativas:</span>{" "}
                            {job.attemptsMade} de {job.maxAttempts}
                          </div>
                        </div>
                        {job.failedReason !== undefined && (
                          <div>
                            <div className="text-xs font-semibold text-status-danger mb-1">Motivo da falha:</div>
                            <pre className="text-[11px] bg-status-danger-subtle/50 text-status-danger p-2 overflow-x-auto max-h-40 whitespace-pre-wrap" style={{ borderRadius: 0 }}>
                              {job.failedReason}
                            </pre>
                          </div>
                        )}
                        {job.data !== null && job.data !== undefined && JSON.stringify(job.data) !== "{}" && (
                          <div>
                            <div className="text-xs font-semibold text-foreground mb-1">Payload:</div>
                            <pre className="text-[11px] bg-muted p-2 overflow-x-auto max-h-40" style={{ borderRadius: 0 }}>
                              {JSON.stringify(job.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-4 py-2 flex items-center justify-between gap-3">
        <span className="text-[10px] text-muted-foreground">
          {rangeStart}–{rangeEnd} de {jobs.length.toLocaleString("pt-BR")}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              style={{ borderRadius: 0 }}
              disabled={safePage === 1}
              onClick={() => { setPage(safePage - 1) }}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[11px] text-muted-foreground px-1">{safePage} / {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              style={{ borderRadius: 0 }}
              disabled={safePage === totalPages}
              onClick={() => { setPage(safePage + 1) }}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function QueueOverviewSection({ queue }: Props): React.ReactElement {
  const allLiveJobs: LiveJobSummary[] = [
    ...queue.activeJobs,
    ...queue.waitingJobs,
    ...queue.delayedJobs,
    ...queue.failedJobs,
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">{QUEUE_LABELS[queue.name] ?? queue.name}</h2>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {(["active", "waiting", "delayed", "failed", "completed", "paused"] as const).map((status) => (
          <Card key={status} className="text-center py-3">
            <CardContent className="p-0">
              <div className={`text-2xl font-bold ${status === "failed" && queue.counts[status] > 0 ? "text-status-danger" : ""} ${status === "active" && queue.counts[status] > 0 ? "text-status-info" : ""}`}>
                {queue.counts[status]}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 capitalize">{STATUS_LABELS[status] ?? status}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {queue.repeatableJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agendamentos recorrentes</CardTitle>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Jobs automáticos registrados no Redis. Cada entrada mostra a frequência de execução e o próximo disparo previsto no fuso UTC-3.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {queue.repeatableJobs.map((r) => (
                <div key={r.key} className="py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="block font-medium text-sm">{JOB_NAME_LABELS[r.name] ?? r.name}</span>
                  {JOB_DESCRIPTIONS[r.name] !== undefined && (
                    <span className="block text-xs text-muted-foreground/80 mt-0.5 mb-1">{JOB_DESCRIPTIONS[r.name]}</span>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-muted-foreground text-xs">{describeCron(r.cron)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/60">({r.cron})</span>
                    {r.nextRunAt !== null && (
                      <span className="text-muted-foreground text-xs ml-auto">
                        próximo: {formatTimestamp(r.nextRunAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {allLiveJobs.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jobs na fila agora{" "}
              <span className="text-[11px] font-normal">({allLiveJobs.length.toLocaleString("pt-BR")})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LiveJobsTable jobs={allLiveJobs} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum job ativo, aguardando ou com falha no momento.</p>
      )}
    </div>
  )
}
