"use client"

import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"

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
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest">{title}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 mb-6">{description}</p>
          <div className="flex justify-end gap-2">
            <DialogClose
              style={{ borderRadius: 0 }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </DialogClose>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{ borderRadius: 0 }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
