"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Settings2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { updateClimateSurveyDisplaySettingsAction } from "@/app/(tenant)/climate-surveys/actions"

interface ClimateSurveyDisplaySettingsButtonProps {
  minRespondentsPercent: number
}

const INPUT_CLASS =
  "w-full bg-input border border-input-border text-foreground text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

export function ClimateSurveyDisplaySettingsButton({
  minRespondentsPercent,
}: ClimateSurveyDisplaySettingsButtonProps): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(String(minRespondentsPercent))

  function handleSave(): void {
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
      toast.error("O percentual deve estar entre 1 e 100.")
      return
    }
    startTransition(async () => {
      const result = await updateClimateSurveyDisplaySettingsAction(parsed)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      toast.success("Configuração salva.")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        style={{ borderRadius: 0 }}
      >
        <Settings2 className="h-3.5 w-3.5" />
        Configurações
      </button>

      <Dialog open={open} onOpenChange={(next) => { if (!next) setOpen(false) }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-md" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">
              Configurações de exibição
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Defina quando os resultados da Pesquisa de Clima ficam visíveis.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                Percentual mínimo de participação (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={value}
                onChange={(event) => { setValue(event.target.value) }}
                className={INPUT_CLASS}
                style={{ borderRadius: 0 }}
              />
              <p className="text-[11px] text-muted-foreground">
                Os resultados são exibidos quando a participação atinge esse percentual dos destinatários (mínimo de 3 respondentes), preservando o anonimato.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <DialogClose
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                style={{ borderRadius: 0 }}
              >
                Cancelar
              </DialogClose>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                style={{ borderRadius: 0 }}
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  )
}
