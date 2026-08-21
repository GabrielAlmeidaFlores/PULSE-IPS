"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ClipboardList } from "lucide-react"
import { createClimateSurveyActionPlanAction } from "@/app/(tenant)/climate-surveys/[dispatchId]/actions"

interface CreateClimateSurveyActionPlanButtonProps {
  dispatchId: string
}

export function CreateClimateSurveyActionPlanButton({
  dispatchId,
}: CreateClimateSurveyActionPlanButtonProps): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick(): void {
    startTransition(async () => {
      const result = await createClimateSurveyActionPlanAction(dispatchId)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      if (result.planId === undefined) {
        toast.error("Não foi possível criar o plano de ação.")
        return
      }
      toast.success("Plano de ação criado.")
      router.push("/climate-surveys/action-plans")
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      style={{ borderRadius: 0 }}
    >
      <ClipboardList className="h-3.5 w-3.5" />
      {isPending ? "Criando..." : "Criar plano de ação"}
    </button>
  )
}
