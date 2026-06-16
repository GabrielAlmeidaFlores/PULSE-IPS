"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, XCircle } from "lucide-react"
import { NativeSelect } from "@/components/ui/native-select"
import { Input } from "@/components/ui/input"
import { assignPlanToOrgAction } from "@/app/(super-admin)/super-admin/organizations/[id]/actions"
import type { PlanWithPricesAndFeatures } from "@/modules/plans/plan.service"
import { ALL_DISPLAY_FEATURES, PLAN_FEATURE_LABELS, type PlanFeature } from "@/modules/plans/plan.types"

interface Props {
  organizationId: string
  plans: PlanWithPricesAndFeatures[]
}

const INTERVAL_LABELS: Record<string, string> = {
  month: "mês",
  year: "ano",
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function AssignPlanForm({ organizationId, plans }: Props): React.ReactElement {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [selectedPriceId, setSelectedPriceId] = useState<string>("")
  const [trialDate, setTrialDate] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)
  const prices = selectedPlan?.prices ?? []
  const selectedPrice = prices.find((pr) => pr.id === selectedPriceId)

  function handlePlanChange(planId: string): void {
    setSelectedPlanId(planId)
    setSelectedPriceId("")
  }

  function handleSave(): void {
    if (!selectedPriceId) {
      toast.error("Selecione um plano e um preço.")
      return
    }
    startTransition(async () => {
      const result = await assignPlanToOrgAction(
        organizationId,
        selectedPriceId,
        trialDate.length > 0 ? trialDate : null,
      )
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Plano atribuído com sucesso.")
        setSelectedPlanId("")
        setSelectedPriceId("")
        setTrialDate("")
      }
    })
  }

  return (
    <div className="space-y-3">
      <NativeSelect
        value={selectedPlanId}
        onChange={(e) => { handlePlanChange(e.target.value) }}
        className="text-[12px] py-2"
        disabled={isPending}
      >
        <option value="">Selecione um plano…</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}{p.isActive ? "" : " (inativo)"}
          </option>
        ))}
      </NativeSelect>

      {selectedPlanId !== "" && prices.length === 0 && (
        <p className="text-[10px] text-status-warning">
          Este plano não possui preços cadastrados.
        </p>
      )}

      {prices.length > 0 && (
        <NativeSelect
          value={selectedPriceId}
          onChange={(e) => { setSelectedPriceId(e.target.value) }}
          className="text-[12px] py-2"
          disabled={isPending}
        >
          <option value="">Selecione um preço…</option>
          {prices.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {formatBRL(pr.priceInCents)}/{INTERVAL_LABELS[pr.interval] ?? pr.interval}
              {pr.isActive ? "" : " (inativo)"}
            </option>
          ))}
        </NativeSelect>
      )}

      {selectedPlan !== undefined && selectedPrice !== undefined && (
        <div className="border border-border bg-muted/30 p-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">
                Preço
              </p>
              <p className="text-[12px] font-black text-foreground">
                {formatBRL(selectedPrice.priceInCents)}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                  /{INTERVAL_LABELS[selectedPrice.interval] ?? selectedPrice.interval}
                </span>
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">
                Colaboradores
              </p>
              <p className="text-[12px] font-black text-foreground">
                {selectedPlan.maxEmployees ?? "∞"}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">
                Ciclo
              </p>
              <p className="text-[12px] font-black text-foreground">
                {selectedPrice.interval === "month" ? "Mensal" : "Anual"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5">
              Funcionalidades
            </p>
            <div className="space-y-1">
              {ALL_DISPLAY_FEATURES.map((feat) => {
                const included =
                  feat.alwaysEnabled ||
                  selectedPlan.features.includes(feat.key as PlanFeature)
                return (
                  <div key={feat.key} className="flex items-center gap-1.5">
                    {included ? (
                      <CheckCircle2 className="h-3 w-3 text-status-success shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={`text-[11px] ${included ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {feat.key in PLAN_FEATURE_LABELS
                        ? PLAN_FEATURE_LABELS[feat.key as PlanFeature]
                        : feat.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] text-muted-foreground mb-1">Trial expira em (opcional)</p>
        <Input
          type="date"
          value={trialDate}
          onChange={(e) => { setTrialDate(e.target.value) }}
          className="text-[12px] h-8"
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={isPending || selectedPriceId === ""}
          className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ borderRadius: 0 }}
        >
          {isPending ? "Salvando…" : "Atribuir plano"}
        </button>
        {trialDate.length > 0 && (
          <button
            onClick={() => { setTrialDate("") }}
            disabled={isPending}
            className="px-2 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-[10px] font-bold tracking-widest uppercase transition-colors"
            style={{ borderRadius: 0 }}
          >
            Sem trial
          </button>
        )}
      </div>
    </div>
  )
}
