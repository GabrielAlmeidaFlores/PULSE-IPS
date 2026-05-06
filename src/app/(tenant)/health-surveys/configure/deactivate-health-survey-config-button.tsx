"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deactivateHealthSurveyConfigAction } from "@/app/(tenant)/health-surveys/configure/actions"

interface DeactivateHealthSurveyConfigButtonProps {
  configId: string
  configName: string
}

export function DeactivateHealthSurveyConfigButton({ configId, configName }: DeactivateHealthSurveyConfigButtonProps): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleConfirm(): void {
    startTransition(async () => {
      const result = await deactivateHealthSurveyConfigAction(configId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Pesquisa desativada com sucesso")
        router.refresh()
      }
      setShowConfirm(false)
    })
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground hidden sm:inline">Desativar &ldquo;{configName}&rdquo;?</span>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
          style={{ borderRadius: 0 }}
          type="button"
        >
          {isPending ? "..." : "Confirmar"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          style={{ borderRadius: 0 }}
          type="button"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="p-1.5 text-muted-foreground hover:text-status-danger transition-colors"
      style={{ borderRadius: 0 }}
      type="button"
      title={`Desativar pesquisa "${configName}"`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
