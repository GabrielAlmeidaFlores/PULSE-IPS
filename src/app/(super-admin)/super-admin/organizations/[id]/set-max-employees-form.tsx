"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { setOrgMaxEmployeesOverrideAction } from "@/app/(super-admin)/super-admin/organizations/[id]/actions"

interface Props {
  organizationId: string
  currentValue: number | null
}

export function SetMaxEmployeesForm({ organizationId, currentValue }: Props): React.ReactElement {
  const [value, setValue] = useState<string>(currentValue !== null ? String(currentValue) : "")
  const [isPending, startTransition] = useTransition()

  function handleSave(): void {
    startTransition(async () => {
      const result = await setOrgMaxEmployeesOverrideAction(organizationId, value)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(value === "" ? "Override removido." : "Limite atualizado.")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => { setValue(e.target.value) }}
        placeholder="Padrão do plano"
        className="flex-1 bg-input border border-border text-foreground text-[11px] px-2 py-1.5 focus:outline-none focus:border-primary"
        style={{ borderRadius: 0 }}
        disabled={isPending}
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-[10px] font-bold tracking-widest uppercase transition-colors disabled:opacity-50"
        style={{ borderRadius: 0 }}
      >
        {isPending ? "…" : "Salvar"}
      </button>
      {value !== "" && (
        <button
          onClick={() => { setValue("") }}
          disabled={isPending}
          className="px-2 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-[10px] transition-colors"
          style={{ borderRadius: 0 }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
