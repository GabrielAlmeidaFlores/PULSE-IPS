"use client"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { setOrgTrialAction } from "@/app/(super-admin)/super-admin/organizations/[id]/actions"

interface Props {
  organizationId: string
  trialExpiresAt: Date | null
}

export function SetTrialForm({ organizationId, trialExpiresAt }: Props): React.ReactElement {
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState<string>(
    trialExpiresAt !== null ? trialExpiresAt.toISOString().split("T")[0] ?? "" : "",
  )

  function handleSave(): void {
    startTransition(async () => {
      const result = await setOrgTrialAction(organizationId, date.length > 0 ? date : null)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(date.length > 0 ? "Período de teste definido." : "Período de teste removido.")
      }
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="date"
        value={date}
        onChange={(e) => { setDate(e.target.value) }}
        disabled={pending}
        style={{ borderRadius: 0 }}
        className="text-[11px] px-2 py-1 border border-border bg-input text-foreground focus:outline-none focus:border-primary dark:[color-scheme:dark]"
      />
      <button
        onClick={handleSave}
        disabled={pending}
        style={{ borderRadius: 0 }}
        className="px-2 py-1 text-[11px] font-bold uppercase tracking-widest border border-primary bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? "..." : "Salvar"}
      </button>
      {date.length > 0 && (
        <button
          onClick={() => { setDate("") }}
          disabled={pending}
          style={{ borderRadius: 0 }}
          className="px-2 py-1 text-[11px] font-bold uppercase tracking-widest border border-status-danger-border text-status-danger hover:bg-status-danger-subtle disabled:opacity-50 transition-colors"
        >
          Limpar
        </button>
      )}
    </div>
  )
}
