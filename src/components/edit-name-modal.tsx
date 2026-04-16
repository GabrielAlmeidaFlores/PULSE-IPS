"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  onClose: () => void
  onSave: (name: string) => void
  loading?: boolean
  initialName?: string
}

export function EditNameModal({ open, onClose, onSave, loading, initialName = "" }: Props): React.ReactElement {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  function handleSave(): void {
    if (!name.trim()) return
    onSave(name.trim())
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest">Renomear departamento</DialogTitle>
          <div className="mt-4 mb-6">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
              style={{ borderRadius: 0 }}
              className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose
              style={{ borderRadius: 0 }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </DialogClose>
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              style={{ borderRadius: 0 }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
