"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ConfirmActionModal } from "@/components/confirm-action-modal"
import { triggerClimateSurveyReminderNowAction } from "@/app/(tenant)/climate-surveys/adherence/actions"
import {
  CLIMATE_SURVEY_ADHERENCE_REINFORCE_THRESHOLD_PERCENT,
  type ClimateSurveyAdherenceReminderArea,
} from "@/modules/climate-surveys/climate-survey.types"

interface Props {
  dispatchId: string
  reminderAreas: ClimateSurveyAdherenceReminderArea[]
  canSendReminderNow: boolean
  pendingReminderCount: number
}

export function ClimateSurveyAdherenceReminderCard({
  dispatchId,
  reminderAreas,
  canSendReminderNow,
  pendingReminderCount,
}: Props): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm(): void {
    startTransition(async () => {
      const result = await triggerClimateSurveyReminderNowAction(dispatchId)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      setOpen(false)
      toast.success(`Lembrete enfileirado para ${String(result.sentCount ?? 0)} colaborador(es).`)
      router.refresh()
    })
  }

  return (
    <>
      <div className="border border-status-warning-border bg-status-warning-subtle px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-status-warning">
              Lembrete automático
            </p>
            <p className="text-sm font-bold text-foreground mt-1">
              Áreas abaixo de {CLIMATE_SURVEY_ADHERENCE_REINFORCE_THRESHOLD_PERCENT}% de adesão
            </p>
            {reminderAreas.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhuma área precisa de reforço no momento.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {reminderAreas.map((area) => (
                  <li key={area.departmentId} className="text-xs text-foreground">
                    <span className="font-medium">{area.departmentName}</span>
                    {" · "}
                    <span className="tabular-nums">{area.adherencePercent}%</span>
                    {" · "}
                    <span className="text-muted-foreground">{area.pendingResponses} pendente(s)</span>
                  </li>
                ))}
              </ul>
            )}
            {pendingReminderCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">
                {pendingReminderCount} colaborador(es) com link de mensagem ainda sem resposta.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!canSendReminderNow || isPending}
            className="shrink-0 min-h-11 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-status-warning text-status-warning-foreground hover:bg-status-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: 0 }}
          >
            Disparar lembrete agora
          </button>
        </div>
      </div>

      <ConfirmActionModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        loading={isPending}
        title="Disparar lembrete agora"
        description={`Será enviado um lembrete por mensagem para até ${String(pendingReminderCount)} colaborador(es) que ainda não responderam. Confirma o disparo?`}
        confirmLabel="Disparar agora"
        variant="warning"
      />
    </>
  )
}
