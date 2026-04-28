"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { generatePgrReportAction } from "@/app/(tenant)/pgr/actions"

export function PgrGenerateButton(): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [period, setPeriod] = useState("")

  function handleSubmit(): void {
    if (!period) {
      toast.error("Selecione um período.")
      return
    }
    startTransition(async () => {
      const result = await generatePgrReportAction(period)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Relatório PGR gerado com sucesso.")
        setPeriod("")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="month"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className="bg-input border border-border text-foreground text-[12px] px-3 py-2 focus:outline-none focus:border-primary [color-scheme:light] dark:[color-scheme:dark]"
        style={{ borderRadius: 0 }}
        disabled={isPending}
      />
      <button
        onClick={handleSubmit}
        disabled={isPending || !period}
        className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderRadius: 0 }}
      >
        {isPending ? "Gerando..." : "Gerar Relatório"}
      </button>
    </div>
  )
}
