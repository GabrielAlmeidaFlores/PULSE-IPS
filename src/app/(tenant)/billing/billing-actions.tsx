"use client"
import { useTransition } from "react"
import { toast } from "sonner"
import { startCheckoutAction, openBillingPortalAction } from "@/app/(tenant)/billing/actions"

interface PlanCardProps {
  externalPriceId: string | null
  planName: string
  priceLabel: string
  maxEmployees: number
  description: string | null
}

export function PlanCard({ externalPriceId, planName, priceLabel, maxEmployees, description }: PlanCardProps): React.ReactElement {
  const [pending, startTransition] = useTransition()

  function handleCheckout(): void {
    if (!externalPriceId) return
    startTransition(async () => {
      const result = await startCheckoutAction(externalPriceId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{planName}</p>
        <p className="text-xs text-muted-foreground">{description} — ate {maxEmployees} colaboradores</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{priceLabel}</span>
        <button
          onClick={handleCheckout}
          disabled={pending || !externalPriceId}
          title={!externalPriceId ? "Plano sem preço configurado" : undefined}
          style={{ borderRadius: 0 }}
          className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border border-primary bg-primary text-primary-foreground hover:opacity-90 ${  pending || !externalPriceId ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          {pending ? "Aguarde..." : "Assinar"}
        </button>
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
