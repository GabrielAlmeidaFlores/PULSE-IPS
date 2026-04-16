import { getOrganizationBilling } from "@/modules/organizations/organization.service"
import { getAllPlans } from "@/modules/plans/plan.service"
import Link from "next/link"
import { ArrowLeft, CreditCard } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default async function OrgBillingPage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params
  const [org, plans] = await Promise.all([
    getOrganizationBilling(id),
    getAllPlans(),
  ])

  if (!org) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-3 border-b border-border bg-card">
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Organização não encontrada</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card shrink-0">
        <Link
          href={`/super-admin/organizations/${id}`}
          className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {org.name}
        </Link>
        <div className="h-4 w-px bg-border" />
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Billing</h1>
          <p className="text-[11px] text-muted-foreground">Assinatura e planos disponíveis</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-muted">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Status de Billing</span>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Status</span>
              <span
                className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 ${org.billingStatus === "active" ? "admin-bg-green admin-accent-green" : "admin-bg-amber admin-accent-amber"}`}
                style={{ borderRadius: 0 }}
              >
                {org.billingStatus}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Plano Atual</span>
              <span className="text-[12px] font-semibold text-foreground">{org.plan?.name ?? "—"}</span>
            </div>
            {org.maxEmployeesOverride !== null && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Override de Colaboradores</span>
                <span className="text-[12px] font-mono admin-accent-amber">{org.maxEmployeesOverride}</span>
              </div>
            )}
            {org.subscription && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Assinatura</span>
                  <span className="text-[12px] font-semibold text-foreground">{org.subscription.snapshotPlanName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Valor</span>
                  <span className="text-[12px] font-mono admin-accent-green">
                    {formatBRL(org.subscription.snapshotPriceInCents)}/{org.subscription.snapshotInterval}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Período</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR").format(org.subscription.currentPeriodStart)} →{" "}
                    {new Intl.DateTimeFormat("pt-BR").format(org.subscription.currentPeriodEnd)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
          <div className="px-4 py-2.5 border-b border-border bg-muted">
            <span className="text-[10px] font-black tracking-widest uppercase text-foreground">Planos Disponíveis</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {plans.map((plan) => (
              <div key={plan.id} className="p-4 space-y-2">
                <div>
                  <p className="text-[13px] font-bold text-foreground">{plan.name}</p>
                  <p className="text-[11px] text-muted-foreground">{plan.description ?? "—"}</p>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Máx. {plan.maxEmployees >= 99999 ? "ilimitado" : `${plan.maxEmployees} colaboradores`}
                </div>
                <div className="space-y-1">
                  {plan.prices.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="font-mono text-[12px] admin-accent-green font-bold">
                        {formatBRL(p.priceInCents)}/{p.interval}
                      </span>
                      <span
                        className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 ${p.isActive ? "admin-bg-green admin-accent-green" : "bg-muted text-muted-foreground"}`}
                        style={{ borderRadius: 0 }}
                      >
                        {p.isActive ? "ativo" : "inativo"}
                      </span>
                    </div>
                  ))}
                  {plan.prices.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">Sem preços configurados</span>
                  )}
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="p-4 text-[11px] text-muted-foreground">Nenhum plano cadastrado.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

