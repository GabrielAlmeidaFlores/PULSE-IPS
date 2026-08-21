"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { fromZonedTime } from "date-fns-tz"
import { NativeSelect } from "@/components/ui/native-select"
import { scheduleClimateSurveyDispatchAction } from "@/app/(tenant)/climate-surveys/actions"

interface ClimateSurveyConfigOption {
  id: string
  name: string
  departmentName: string
}

interface ScheduleClimateSurveyDispatchButtonProps {
  hasConfigs: boolean
  configs: ClimateSurveyConfigOption[]
  orgTimezone: string
}

function getOrgLocalDatetimeString(timezone: string): string {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setTime(now.getTime() + 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "00"
  const hour = get("hour")
  return `${get("year")}-${get("month")}-${get("day")}T${hour === "24" ? "00" : hour}:${get("minute")}`
}

export function ScheduleClimateSurveyDispatchButton({ hasConfigs, configs, orgTimezone }: ScheduleClimateSurveyDispatchButtonProps): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [configId, setConfigId] = useState<string>(() => configs[0]?.id ?? "")
  const [scheduledAt, setScheduledAt] = useState(() => getOrgLocalDatetimeString(orgTimezone))

  function handleOpen(): void {
    setConfigId(configs[0]?.id ?? "")
    setScheduledAt(getOrgLocalDatetimeString(orgTimezone))
    setOpen(true)
  }

  function handleSubmit(): void {
    if (configId === "") {
      toast.error("Selecione uma pesquisa.")
      return
    }
    startTransition(async () => {
      const utcDate = fromZonedTime(scheduledAt, orgTimezone)
      const result = await scheduleClimateSurveyDispatchAction(configId, utcDate.toISOString())
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Disparo agendado com sucesso")
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={!hasConfigs}
        title={!hasConfigs ? "Configure uma pesquisa antes de agendar" : undefined}
        className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-primary"
        style={{ borderRadius: 0 }}
      >
        <CalendarClock className="h-3.5 w-3.5" />
        Agendar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border w-full max-w-sm mx-4" style={{ borderRadius: 0 }}>
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest">Agendar Disparo</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                style={{ borderRadius: 0 }}
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Pesquisa
                </label>
                <NativeSelect
                  value={configId}
                  onChange={(e) => setConfigId(e.target.value)}
                >
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.departmentName}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Data e hora
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-input border border-input-border text-foreground text-sm px-3 py-2.5 focus:outline-none focus:border-primary transition-colors"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>
            <div className="border-t border-border px-4 py-3 flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
                style={{ borderRadius: 0 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || configId === ""}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                style={{ borderRadius: 0 }}
              >
                {isPending ? "Agendando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
