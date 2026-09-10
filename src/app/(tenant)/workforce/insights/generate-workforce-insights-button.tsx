"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { generateWorkforceInsightsAction } from "@/app/(tenant)/workforce/insights/actions"

interface GenerateWorkforceInsightsButtonProps {
  competencia?: string
}

export function GenerateWorkforceInsightsButton({ competencia }: GenerateWorkforceInsightsButtonProps): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick(): void {
    startTransition(async () => {
      const result = await generateWorkforceInsightsAction(competencia)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      toast.success("Análise gerada com IA.")
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      style={{ borderRadius: 0 }}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {isPending ? "Analisando..." : "Gerar análise com IA"}
    </button>
  )
}
