"use client"
import { useTransition } from "react"
import { toast } from "sonner"
import { Check, X } from "lucide-react"
import { startCheckoutAction, openBillingPortalAction } from "@/app/(tenant)/billing/actions"
import { ALL_DISPLAY_FEATURES, type PlanFeature } from "@/modules/plans/plan.types"

interface PlanCardProps {
  externalPriceId: string | null
  planName: string
  priceLabel: string
  maxEmployees: number
  description: string | null
  features: PlanFeature[]
  isCurrent?: boolean
}

export function PlanCard({ externalPriceId, planName, priceLabel, maxEmployees, description, features, isCurrent = false }: PlanCardProps): React.ReactElement {
  const [pending, startTransition] = useTransition()
  const enabledFeatureKeys = new Set<string>(features)

  function handleCheckout(): void {
    if (!externalPriceId) return
    startTransition(async () => {
      const result = await startCheckoutAction(externalPriceId)
      if (result?.error) toast.error(result.error)
    })
  }

  let buttonLabel = "Assinar"
  if (isCurrent) buttonLabel = "Plano atual"
  else if (pending) buttonLabel = "Aguarde..."

  let buttonTitle: string | undefined
  if (isCurrent) buttonTitle = "Este é seu plano atual"
  else if (!externalPriceId) buttonTitle = "Plano sem preço configurado"

  const disabledClass = (pending || !externalPriceId) ? " opacity-40 cursor-not-allowed" : ""
  let buttonClass = `border-primary bg-primary text-primary-foreground hover:opacity-90${disabledClass}`
  if (isCurrent) buttonClass = "border-primary/30 bg-primary/10 text-primary cursor-default"

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{planName}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">Até {maxEmployees >= 99999 ? "colaboradores ilimitados" : `${maxEmployees} colaboradores`}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-sm font-semibold text-foreground">{priceLabel}</span>
          <button
            onClick={handleCheckout}
            disabled={pending || !externalPriceId || isCurrent}
            title={buttonTitle}
            style={{ borderRadius: 0 }}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border ${buttonClass}`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-border">
        {ALL_DISPLAY_FEATURES.map((displayFeature) => {
          const isEnabled = displayFeature.alwaysEnabled || enabledFeatureKeys.has(displayFeature.key)
          return (
            <span key={displayFeature.key} className={`flex items-center gap-1 text-[11px] ${isEnabled ? "text-muted-foreground" : "text-muted-foreground/40 line-through"}`}>
              {isEnabled ? (
                <Check className="h-3 w-3 text-primary shrink-0" />
              ) : (
                <X className="h-3 w-3 text-destructive/60 shrink-0" />
              )}
              {displayFeature.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function ManageSubscriptionButton(): React.ReactElement {
  const [pending, startTransition] = useTransition()

  function handlePortal(): void {
    startTransition(async () => {
      const result = await openBillingPortalAction()
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <button
      onClick={handlePortal}
      disabled={pending}
      style={{ borderRadius: 0 }}
      className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground hover:bg-muted ${  pending ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {pending ? "Redirecionando..." : "Gerenciar assinatura"}
    </button>
  )
}
