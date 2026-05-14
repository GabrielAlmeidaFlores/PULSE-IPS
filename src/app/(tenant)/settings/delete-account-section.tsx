"use client"

import { useState } from "react"
import { DangerZone } from "@/components/danger-zone"
import { DeleteAccountModal } from "@/app/(tenant)/settings/delete-account-modal"

export function DeleteAccountSection(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [openCount, setOpenCount] = useState(0)

  function handleOpen(): void {
    setOpenCount((c) => c + 1)
    setOpen(true)
  }

  return (
    <>
      <DangerZone
        sectionTitle="Excluir organização"
        className="max-w-lg"
        actionTitle="Excluir organização"
        actionDescription="Cancela a assinatura e agenda a exclusão permanente de todos os dados em 30 dias."
        actionLabel="Excluir conta"
        onAction={handleOpen}
      />
      <DeleteAccountModal key={openCount} open={open} onClose={() => { setOpen(false) }} />
    </>
  )
}
