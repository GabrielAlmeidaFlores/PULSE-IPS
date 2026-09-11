"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Copy, FileDown, Loader2 } from "lucide-react"
import { duplicateClimateSurveyConfigAction } from "@/app/(tenant)/climate-surveys/reports/actions"

interface Props {
  dispatchId: string
  configId: string
}

const actionButtonClass =
  "flex items-center gap-1 px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

export function ClimateSurveyWaveReportActions({ dispatchId, configId }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDuplicate(): void {
    startTransition(async () => {
      const result = await duplicateClimateSurveyConfigAction(configId)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      toast.success("Configuração duplicada. Revise e dispare a nova onda.")
      if (result.configId !== undefined) {
        router.push(`/climate-surveys/configure/${result.configId}`)
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <a
        href={`/api/climate-surveys/${dispatchId}/pdf`}
        className={actionButtonClass}
        style={{ borderRadius: 0 }}
        title="Exportar PDF"
      >
        <FileDown size={12} />
      </a>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isPending}
        className={actionButtonClass}
        style={{ borderRadius: 0 }}
        title="Duplicar configuração"
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
      </button>
    </div>
  )
}
