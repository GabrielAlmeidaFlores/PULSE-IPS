"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { generatePgrReportAction } from "@/app/(tenant)/pgr/actions"

export function PgrGenerateButton(): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [period, setPeriod] = useState("")
  const [confirmReplace, setConfirmReplace] = useState(false)

  function handleSubmit(force = false): void {
    if (!period) {
      toast.error("Selecione um período.")
      return
    }
    startTransition(async () => {
      const result = await generatePgrReportAction(period, force)
      if (result.code === "DUPLICATE_PGR_PERIOD") {
        setConfirmReplace(true)
        return
      }
      if (result.error) {
        toast.error(result.error)
        return
      }
      setConfirmReplace(false)
      setPeriod("")
      toast.success("Relatório PGR gerado com sucesso.")
    })
  }

  function handleConfirmReplace(): void {
    setConfirmReplace(false)
    handleSubmit(true)
  }

  function handleCancelReplace(): void {
    setConfirmReplace(false)
  }

  if (confirmReplace) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-status-warning font-medium">
          Já existe um relatório para este período. Substituir?
        </span>
        <button
          onClick={handleConfirmReplace}
          disabled={isPending}
          className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider bg-status-danger text-status-danger-foreground hover:bg-status-danger/90 transition-colors disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          {isPending ? "Substituindo..." : "Sim, substituir"}
        </button>
        <button
          onClick={handleCancelReplace}
          disabled={isPending}
          className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="month"
        value={period}
        onChange={(e) => {
          setPeriod(e.target.value)
          setConfirmReplace(false)
        }}
        className="bg-input border border-border text-foreground text-[12px] px-3 py-2 focus:outline-none focus:border-primary [color-scheme:light] dark:[color-scheme:dark]"
        style={{ borderRadius: 0 }}
        disabled={isPending}
      />
      <button
        onClick={() => handleSubmit(false)}
        disabled={isPending || !period}
        className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderRadius: 0 }}
      >
        {isPending ? "Gerando..." : "Gerar Relatório"}
      </button>
    </div>
  )
}
