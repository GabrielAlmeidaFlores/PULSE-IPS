"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ConfirmActionModal } from "@/components/confirm-action-modal"
import { cancelOrgSubscriptionAction } from "@/app/(super-admin)/super-admin/organizations/[id]/actions"

interface Props {
  organizationId: string
}

export function CancelSubscriptionButton({ organizationId }: Props): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm(): void {
    startTransition(async () => {
      const result = await cancelOrgSubscriptionAction(organizationId)
      if (result.error) {
        toast.error(result.error)
      } else {
        setOpen(false)
        toast.success("Assinatura cancelada.")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true) }}
        className="flex items-center gap-1 px-2 py-1 border border-status-danger-border text-status-danger hover:bg-status-danger-subtle transition-colors text-[10px] font-bold tracking-widest uppercase"
        style={{ borderRadius: 0 }}
      >
        Cancelar assinatura
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => { setOpen(false) }}
        onConfirm={handleConfirm}
        loading={isPending}
        title="Cancelar assinatura"
        description="Tem certeza que deseja cancelar a assinatura desta organização? O acesso ao painel será bloqueado imediatamente."
        confirmLabel="Cancelar assinatura"
        variant="destructive"
      />
    </>
  )
}
