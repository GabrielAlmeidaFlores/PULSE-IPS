import type { QueueStatus, LiveJobSummary } from "@/modules/queue-status/queue-status.types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  queue: QueueStatus
}

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-blue-100 text-blue-800 border-blue-300",
  waiting:  "bg-yellow-100 text-yellow-800 border-yellow-300",
  delayed:  "bg-purple-100 text-purple-800 border-purple-300",
  failed:   "bg-red-100 text-red-800 border-red-300",
  completed:"bg-green-100 text-green-800 border-green-300",
  paused:   "bg-neutral-100 text-neutral-800 border-neutral-300",
}

const QUEUE_LABELS: Record<string, string> = {
  "pulse-jobs":     "Jobs Agendados",
  "pulse-messages": "Mensagens",
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function LiveJobRow({ job }: { job: LiveJobSummary }): React.ReactElement {
  return (
    <div className="flex items-center gap-3 py-2 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
      <Badge className={`${STATUS_COLORS[job.status] ?? "bg-muted text-muted-foreground"} border text-[10px] font-semibold`}>
        {job.status}
      </Badge>
      <span className="font-mono font-medium">{job.name}</span>
      <span className="text-muted-foreground flex-1 truncate">id: {job.id}</span>
      <span className="text-muted-foreground text-xs">
        {formatTimestamp(job.timestamp)}
      </span>
      {job.attemptsMade > 0 && (
        <span className="text-muted-foreground text-xs">
          tentativa {job.attemptsMade}/{job.maxAttempts}
        </span>
      )}
      {Boolean(job.failedReason) && (
        <span className="text-red-600 text-xs truncate max-w-[200px]" title={job.failedReason}>
          {job.failedReason}
        </span>
      )}
    </div>
  )
}

export function QueueOverviewSection({ queue }: Props): React.ReactElement {
  const allLiveJobs = [
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
              <div className={`text-2xl font-bold ${status === "failed" && queue.counts[status] > 0 ? "text-red-600" : ""} ${status === "active" && queue.counts[status] > 0 ? "text-blue-600" : ""}`}>
                {queue.counts[status]}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 capitalize">{status}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {queue.repeatableJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agendamentos recorrentes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {queue.repeatableJobs.map((r) => (
                <div key={r.key} className="flex items-center gap-3 py-2 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="font-mono font-medium w-48">{r.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">{r.cron}</span>
                  {r.nextRunAt !== null && (
                    <span className="text-muted-foreground text-xs ml-auto">
                      próximo: {formatTimestamp(r.nextRunAt)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {allLiveJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jobs na fila agora</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {allLiveJobs.map((job) => (
                <LiveJobRow key={`${job.id}-${job.status}`} job={job} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {allLiveJobs.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum job ativo, aguardando ou com falha no momento.</p>
      )}
    </div>
  )
}
