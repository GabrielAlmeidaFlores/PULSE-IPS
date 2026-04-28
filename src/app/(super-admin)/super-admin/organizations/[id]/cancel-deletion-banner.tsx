"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react"
import { cancelOrganizationDeletionAction } from "@/app/(super-admin)/super-admin/organizations/[id]/actions"

interface Props {
  organizationId: string
  deletionScheduledAt: Date
}

export function CancelDeletionBanner({ organizationId, deletionScheduledAt }: Props): React.ReactElement {
  const [isPending, startTransition] = useTransition()

  const formattedDate = new Date(deletionScheduledAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  function handleCancel(): void {
    startTransition(async () => {
      const result = await cancelOrganizationDeletionAction(organizationId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Exclusão agendada cancelada com sucesso.")
    })
  }

  return (
    <div className="border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
        <p className="text-[12px] text-red-800 dark:text-red-300">
          <span className="font-bold">Exclusão agendada para {formattedDate}.</span>
          {" "}Todos os dados serão permanentemente deletados nesta data.
        </p>
      </div>
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
        Cancelar exclusão
      </button>
    </div>
  )
}
