"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deactivateHealthSurveyGroupAction } from "@/app/(tenant)/health-surveys/configure/actions"
import { ConfirmActionModal } from "@/components/confirm-action-modal"

interface DeactivateHealthSurveyGroupButtonProps {
  groupName: string
}

export function DeactivateHealthSurveyGroupButton({ groupName }: DeactivateHealthSurveyGroupButtonProps): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleConfirm(): void {
    startTransition(async () => {
      const result = await deactivateHealthSurveyGroupAction(groupName)
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
        title={`Desativar pesquisa "${groupName}"`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        loading={isPending}
        title="Desativar pesquisa"
        description={`Tem certeza que deseja desativar "${groupName}"? Todos os setores vinculados serão desativados. Esta ação não pode ser desfeita.`}
        confirmLabel="Desativar"
        variant="destructive"
      />
    </>
  )
}
