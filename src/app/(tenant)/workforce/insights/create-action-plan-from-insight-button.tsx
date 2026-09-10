"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ExternalLink, ListPlus } from "lucide-react"
import { toast } from "sonner"
import { createActionPlanFromInsightAction } from "@/app/(tenant)/workforce/insights/actions"

interface CreateActionPlanFromInsightButtonProps {
  insightId: string
}

export function CreateActionPlanFromInsightButton({
  insightId,
}: CreateActionPlanFromInsightButtonProps): React.ReactElement {
  const [planId, setPlanId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick(): void {
    startTransition(async () => {
      const result = await createActionPlanFromInsightAction(insightId)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      if (result.planId === undefined) {
        toast.error("O plano foi criado, mas não foi possível gerar o link.")
        return
      }
      setPlanId(result.planId)
      toast.success("Plano de ação criado com IA.")
    })
  }

  if (planId !== null) {
    return (
      <Link
        href={`/action-plans/${planId}`}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border text-foreground hover:bg-muted transition-colors"
        style={{ borderRadius: 0 }}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Visualizar plano
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      style={{ borderRadius: 0 }}
    >
      <ListPlus className="h-3.5 w-3.5" />
      {isPending ? "Gerando plano..." : "Criar plano de ação"}
    </button>
  )
}
