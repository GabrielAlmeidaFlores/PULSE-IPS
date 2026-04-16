"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { completePlanAction } from "@/app/(tenant)/action-plans/[id]/actions"

interface Props {
  planId: string
  currentStatus: string
}

export function CompletePlanButton({ planId, currentStatus }: Props): React.ReactElement | null {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (currentStatus === "completed") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-primary/30 text-primary bg-primary/10">
        Concluído
      </span>
    )
  }

  function handleComplete(): void {
    startTransition(async () => {
      const result = await completePlanAction(planId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Plano de ação concluído.")
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleComplete}
      disabled={isPending}
      style={{ borderRadius: 0 }}
      className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Concluindo..." : "Concluir Plano"}
    </button>
  )
}
