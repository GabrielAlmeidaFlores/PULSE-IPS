"use client"

import { ConfirmActionModal } from "@/components/confirm-action-modal"

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
  title?: string
  description?: string
}

export function ConfirmDeleteModal({ open, onClose, onConfirm, loading, title = "Confirmar exclusão", description = "Esta ação não pode ser desfeita." }: Props): React.ReactElement {
  return (
    <ConfirmActionModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title={title}
      description={description}
      confirmLabel={loading ? "Excluindo..." : "Excluir"}
      variant="destructive"
    />
  )
}
