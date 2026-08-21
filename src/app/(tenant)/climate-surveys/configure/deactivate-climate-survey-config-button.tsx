"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deactivateClimateSurveyConfigAction } from "@/app/(tenant)/climate-surveys/configure/actions"
import { ConfirmActionModal } from "@/components/confirm-action-modal"

interface DeactivateClimateSurveyConfigButtonProps {
  configId: string
  configName: string
}

export function DeactivateClimateSurveyConfigButton({ configId, configName }: DeactivateClimateSurveyConfigButtonProps): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleConfirm(): void {
    startTransition(async () => {
      const result = await deactivateClimateSurveyConfigAction(configId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Pesquisa excluída com sucesso")
        router.refresh()
      }
      setOpen(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 text-muted-foreground hover:text-status-danger transition-colors"
        style={{ borderRadius: 0 }}
        type="button"
        title={`Excluir pesquisa "${configName}"`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        loading={isPending}
        title="Excluir pesquisa"
        description={`Tem certeza que deseja excluir "${configName}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
      />
    </>
  )
}

