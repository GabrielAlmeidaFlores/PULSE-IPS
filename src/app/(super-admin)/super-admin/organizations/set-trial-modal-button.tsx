"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarClock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { setOrgTrialAction } from "@/app/(super-admin)/super-admin/organizations/[id]/actions"

interface Props {
  organizationId: string
  organizationName: string
  trialExpiresAt: Date | null
}

export function SetTrialModalButton({
  organizationId,
  organizationName,
  trialExpiresAt,
}: Props): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState<string>(
    trialExpiresAt !== null ? (trialExpiresAt.toISOString().split("T")[0] ?? "") : "",
  )

  function handleOpen(): void {
    setDate(trialExpiresAt !== null ? (trialExpiresAt.toISOString().split("T")[0] ?? "") : "")
    setOpen(true)
  }

  function handleSave(): void {
    startTransition(async () => {
      const result = await setOrgTrialAction(organizationId, date.length > 0 ? date : null)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      toast.success(date.length > 0 ? "Período de teste definido." : "Período de teste removido.")
      setOpen(false)
      router.refresh()
    })
  }

  const isTrialActive =
    trialExpiresAt !== null && trialExpiresAt > new Date()

  return (
    <>
      <button
        onClick={handleOpen}
        title="Gerenciar trial"
        style={{ borderRadius: 0 }}
        className={`flex items-center gap-1 px-2 py-1 border text-[10px] font-bold uppercase tracking-widest transition-colors ${
          isTrialActive
            ? "border-status-success-border text-status-success hover:bg-status-success-subtle"
            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <CalendarClock size={11} />
        {isTrialActive ? "Teste ativo" : "Definir teste"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ borderRadius: 0 }} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[13px] font-black tracking-[0.15em] uppercase">
              Período de teste
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Organização: <span className="font-semibold text-foreground">{organizationName}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Enquanto a data de expiração do trial for futura, o billing wall não é exibido.
            </p>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                Expira em
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value) }}
                disabled={pending}
                style={{ borderRadius: 0 }}
                className="w-full text-[13px] px-3 py-2.5 border border-border bg-input text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors dark:[color-scheme:dark]"
              />
            </div>
            {date.length > 0 && (
              <button
                type="button"
                onClick={() => { setDate("") }}
                disabled={pending}
                style={{ borderRadius: 0 }}
                className="text-[10px] font-bold uppercase tracking-widest text-status-danger hover:underline disabled:opacity-50"
              >
                Remover trial
              </button>
            )}
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false) }}
              disabled={pending}
              style={{ borderRadius: 0 }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              style={{ borderRadius: 0 }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {pending ? "..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
