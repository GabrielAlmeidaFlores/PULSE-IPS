"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deactivateHealthSurveyConfigAction } from "@/app/(tenant)/health-surveys/configure/actions"
import { ConfirmActionModal } from "@/components/confirm-action-modal"

interface DeactivateHealthSurveyGroupButtonProps {
  configId: string
  configName: string
}

export function DeactivateHealthSurveyGroupButton({ configId, configName }: DeactivateHealthSurveyGroupButtonProps): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleConfirm(): void {
    startTransition(async () => {
      const result = await deactivateHealthSurveyConfigAction(configId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Pesquisa desativada com sucesso")
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
        title={`Desativar pesquisa "${configName}"`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        loading={isPending}
        title="Desativar pesquisa"
        description={`Tem certeza que deseja desativar "${configName}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Desativar"
        variant="destructive"
      />
    </>
  )
}
