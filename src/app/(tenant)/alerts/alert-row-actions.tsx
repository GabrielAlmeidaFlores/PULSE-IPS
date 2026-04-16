"use client"
import { useTransition } from "react"
import { toast } from "sonner"
import { markAlertReadAction, resolveAlertAction } from "@/app/(tenant)/alerts/actions"

interface Props {
  alertId: string
  isRead: boolean
  isResolved: boolean
}

export function AlertRowActions({ alertId, isRead, isResolved }: Props): React.ReactElement {
  const [pending, startTransition] = useTransition()

  function handleMarkRead(): void {
    startTransition(async () => {
      const result = await markAlertReadAction(alertId)
      if (result.error) toast.error(result.error)
    })
  }

  function handleResolve(): void {
    startTransition(async () => {
      const result = await resolveAlertAction(alertId)
      if (result.error) toast.error(result.error)
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={handleMarkRead}
        disabled={pending || isRead || isResolved}
        style={{ borderRadius: 0 }}
        className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted ${  pending || isRead || isResolved ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        Marcar lido
      </button>
      <button
        onClick={handleResolve}
        disabled={pending || isResolved}
        style={{ borderRadius: 0 }}
        className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 ${  pending || isResolved ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        Resolver
      </button>
    </div>
  )
}
