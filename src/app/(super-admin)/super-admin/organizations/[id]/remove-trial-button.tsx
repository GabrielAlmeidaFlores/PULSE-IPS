"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ConfirmActionModal } from "@/components/confirm-action-modal"
import { setOrgTrialAction } from "@/app/(super-admin)/super-admin/organizations/[id]/actions"

interface Props {
  organizationId: string
}

export function RemoveTrialButton({ organizationId }: Props): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm(): void {
    startTransition(async () => {
      const result = await setOrgTrialAction(organizationId, null)
      if (result.error) {
        toast.error(result.error)
      } else {
        setOpen(false)
        toast.success("Trial removido.")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true) }}
        className="flex items-center gap-1 px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[10px] font-bold tracking-widest uppercase"
        style={{ borderRadius: 0 }}
      >
        Remover trial
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => { setOpen(false) }}
        onConfirm={handleConfirm}
        loading={isPending}
        title="Remover período de trial"
        description="Tem certeza que deseja remover o trial desta organização? O billing wall será exibido imediatamente se a assinatura não estiver ativa."
        confirmLabel="Remover trial"
        variant="warning"
      />
    </>
  )
}
