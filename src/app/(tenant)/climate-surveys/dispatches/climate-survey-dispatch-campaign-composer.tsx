"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { fromZonedTime } from "date-fns-tz"
import { NativeSelect } from "@/components/ui/native-select"
import { launchClimateSurveyCampaignAction } from "@/app/(tenant)/climate-surveys/dispatches/actions"
import {
  CLIMATE_SURVEY_CAMPAIGN_FREQUENCIES,
  CLIMATE_SURVEY_FREQUENCY_LABELS,
  type ClimateSurveyCampaignSetup,
  type ClimateSurveyCampaignTimingMode,
  type ClimateSurveyFrequency,
} from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  setup: ClimateSurveyCampaignSetup
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

function mapConfigFrequency(value: string): ClimateSurveyFrequency {
  if (value === "once" || value === "monthly" || value === "quarterly" || value === "semiannual") return value
  return "once"
}

function launchButtonLabel(isPending: boolean, timingMode: ClimateSurveyCampaignTimingMode): string {
  if (isPending) return "Processando..."
  if (timingMode === "now") return "Enviar agora"
  return "Confirmar campanha"
}

function buildMessagePreview(template: string, recipientName: string): string {
  return template
    .replaceAll("{nome}", recipientName)
    .replaceAll("{link}", "https://app.pulseips.com.br/climate-survey/exemplo/1234567")
}

export function ClimateSurveyDispatchCampaignComposer({ setup, orgTimezone }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const firstConfig = setup.configs[0]
  const [configId, setConfigId] = useState(firstConfig?.id ?? "")
  const selectedConfig = setup.configs.find((c) => c.id === configId) ?? firstConfig

  const [frequency, setFrequency] = useState<ClimateSurveyFrequency>(() =>
    mapConfigFrequency(selectedConfig?.frequency ?? "once"),
  )
  const [timingMode, setTimingMode] = useState<ClimateSurveyCampaignTimingMode>("now")
  const [scheduledAt, setScheduledAt] = useState(() => getOrgLocalDatetimeString(orgTimezone))
  const [includedDeptIds, setIncludedDeptIds] = useState<Set<string>>(
    () => new Set(selectedConfig?.departmentIds ?? setup.departments.map((d) => d.id)),
  )

  function handleConfigChange(nextConfigId: string): void {
    setConfigId(nextConfigId)
    const next = setup.configs.find((c) => c.id === nextConfigId)
    if (next === undefined) return
    setFrequency(mapConfigFrequency(next.frequency))
    setIncludedDeptIds(new Set(next.departmentIds.length > 0 ? next.departmentIds : setup.departments.map((d) => d.id)))
  }

  function toggleDepartment(departmentId: string): void {
    setIncludedDeptIds((prev) => {
      const next = new Set(prev)
      if (next.has(departmentId)) next.delete(departmentId)
      else next.add(departmentId)
      return next
    })
  }

  const includedDepartments = useMemo(
    () => setup.departments.filter((d) => includedDeptIds.has(d.id)),
    [setup.departments, includedDeptIds],
  )

  const totalRecipients = includedDepartments.reduce((sum, d) => sum + d.employeeCount, 0)

  const sendAtLabel = useMemo(() => {
    if (timingMode === "now") return "Imediato"
    if (timingMode === "reminder_48h") return "Imediato · lembrete em 48h"
    return scheduledAt.replace("T", " ")
  }, [timingMode, scheduledAt])

  const messagePreview = buildMessagePreview(setup.messageTemplate, "Maria")

  function handleLaunch(): void {
    if (configId === "") {
      toast.error("Selecione uma pesquisa.")
      return
    }
    if (includedDeptIds.size === 0) {
      toast.error("Inclua ao menos um departamento.")
      return
    }
    if (!setup.hasMessagingFeature) {
      toast.error("Seu plano não inclui envio de mensagens.")
      return
    }

    const utcScheduledAt =
      timingMode === "schedule" ? fromZonedTime(scheduledAt, orgTimezone) : new Date()

    startTransition(async () => {
      const result = await launchClimateSurveyCampaignAction({
        configId,
        sendViaMessaging: true,
        sendViaSignedLink: false,
        frequency,
        timingMode,
        scheduledAt: utcScheduledAt.toISOString(),
        departmentIds: Array.from(includedDeptIds),
      })
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      toast.success(timingMode === "now" ? "Campanha enviada para a fila." : "Campanha agendada com sucesso.")
      router.refresh()
    })
  }

  if (setup.configs.length === 0) {
    return (
      <div className="border border-dashed border-border bg-card px-5 py-8 text-center">
        <p className="text-sm font-bold text-muted-foreground">Configure uma pesquisa antes de disparar</p>
        <p className="text-xs text-muted-foreground mt-1">
          Monte o banco de perguntas e depois volte para criar a campanha.
        </p>
      </div>
    )
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4 lg:items-start space-y-4 lg:space-y-0">
      <div className="space-y-4 min-w-0">
        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 bg-muted">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Campanha</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                Pesquisa
              </label>
              <NativeSelect value={configId} onChange={(e) => handleConfigChange(e.target.value)}>
                {setup.configs.map((config) => (
                  <option key={config.id} value={config.id}>{config.name}</option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Recorrência</p>
              <div className="flex flex-wrap gap-1.5">
                {CLIMATE_SURVEY_CAMPAIGN_FREQUENCIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFrequency(value)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                      frequency === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    {CLIMATE_SURVEY_FREQUENCY_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Quando enviar</p>
              <div className="space-y-2">
                {(
                  [
                    { value: "now", label: "Enviar agora" },
                    { value: "schedule", label: "Agendar data" },
                    { value: "reminder_48h", label: "Enviar com lembrete automático em 48h" },
                  ] as const
                ).map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="timingMode"
                      checked={timingMode === option.value}
                      onChange={() => setTimingMode(option.value)}
                      className="accent-primary"
                    />
                    <span className="text-[12px] text-foreground">{option.label}</span>
                  </label>
                ))}
              </div>
              {timingMode === "schedule" && (
                <div className="mt-3">
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
              )}
              {timingMode === "reminder_48h" && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  A campanha sai agora. O lembrete automático é enviado cerca de 48h depois para quem ainda não respondeu.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 bg-muted">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Canais</p>
          </div>
          <div className="p-4">
            <p className="text-sm font-medium text-foreground">WhatsApp</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Envio automático da pesquisa por WhatsApp, com link único e anônimo por colaborador.
            </p>
          </div>
        </div>

        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 bg-muted">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Anonimato</p>
          </div>
          <div className="p-4">
            <p className="text-[11px] text-muted-foreground">
              A participação é controlada separadamente do conteúdo: as respostas são anônimas e não ficam vinculadas
              ao colaborador.
            </p>
          </div>
        </div>

        <div className="border border-border bg-card overflow-x-auto">
          <div className="border-b border-border px-4 py-2.5 bg-muted">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Departamentos</p>
          </div>
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Departamento</th>
                <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Colaboradores</th>
                <th className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Campanha</th>
              </tr>
            </thead>
            <tbody>
              {setup.departments.map((department) => {
                const included = includedDeptIds.has(department.id)
                return (
                  <tr key={department.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{department.name}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{department.employeeCount}</td>
                    <td className="px-4 py-3 text-center">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggleDepartment(department.id)}
                          className="accent-primary"
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {included ? "Incluído" : "Excluído"}
                        </span>
                      </label>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 bg-muted">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Prévia da mensagem</p>
          </div>
          <div className="p-4">
            <div className="border border-border bg-muted/30 px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {messagePreview}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Exemplo com o nome do colaborador e o link da pesquisa.
            </p>
          </div>
        </div>
      </div>

      <aside className="border border-border bg-card lg:sticky lg:top-4">
        <div className="border-b border-border px-4 py-2.5 bg-muted">
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Resumo</p>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destinatários</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{totalRecipients}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Canal</p>
            <p className="text-sm font-medium mt-1">WhatsApp</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recorrência</p>
            <p className="text-sm font-medium mt-1">{CLIMATE_SURVEY_FREQUENCY_LABELS[frequency]}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data/hora do envio</p>
            <p className="text-sm font-medium mt-1">{sendAtLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={isPending}
            className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            style={{ borderRadius: 0 }}
          >
            {launchButtonLabel(isPending, timingMode)}
          </button>
        </div>
      </aside>
    </div>
  )
}
