import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getSuperAdminSession } from "@/modules/auth/session"
import { getPlanWithAllPrices } from "@/modules/plans/plan.service"
import { PlanPricingManager } from "@/app/(super-admin)/super-admin/plans/[id]/pricing/pricing-manager"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlanPricingPage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params
  const session = await getSuperAdminSession()
  if (!session) redirect("/super-admin/login")

  const plan = await getPlanWithAllPrices(id)
  if (!plan) notFound()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/super-admin/plans"
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Planos
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">{plan.name}</h1>
          <span className="text-muted-foreground">/</span>
          <span className="text-[13px] font-black tracking-[0.2em] uppercase text-muted-foreground">Preços</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="text-[11px] text-muted-foreground bg-muted/50 border border-border px-4 py-2.5">
          Ao atualizar um preço, o Stripe cria um novo Price e o anterior é desativado. Assinaturas existentes não são afetadas.
        </div>
        <PlanPricingManager planId={plan.id} prices={plan.prices} />
      </div>
    </div>
  )
}
