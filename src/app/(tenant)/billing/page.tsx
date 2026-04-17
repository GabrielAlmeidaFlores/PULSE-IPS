import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getSubscription } from "@/modules/billing/billing.service"
import { getAllPlans } from "@/modules/plans/plan.service"
import { format } from "date-fns"
import { PlanCard, ManageSubscriptionButton } from "@/app/(tenant)/billing/billing-actions"
import { PageHelp } from "@/components/page-help"

const BILLING_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  trialing: "Em teste",
  past_due: "Em atraso",
  canceled: "Cancelado",
  paused: "Pausado",
  unpaid: "Não pago",
}

const BILLING_STATUS_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  active: "bg-primary/10 text-primary border-primary/20",
  trialing: "bg-yellow-50 text-yellow-700 border-yellow-200",
  past_due: "bg-destructive/10 text-destructive border-destructive/20",
  canceled: "bg-destructive/10 text-destructive border-destructive/20",
  paused: "bg-muted text-muted-foreground border-border",
  unpaid: "bg-destructive/10 text-destructive border-destructive/20",
}

export default async function BillingPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "admin") redirect("/dashboard")

  const [subscription, plans] = await Promise.all([
    getSubscription(session.tenantId),
    getAllPlans(),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm font-bold uppercase tracking-widest">Assinatura</h1>
          <PageHelp text="Gerencia o plano da sua empresa no Pulse. Exibe o plano atual, data de renovação e histórico de pagamentos. Você pode fazer upgrade, downgrade ou cancelar a assinatura a qualquer momento. Disponível apenas para o administrador da conta." />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Gerenciamento de plano e faturamento</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {subscription ? (
          <div className="border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest">Assinatura ativa</span>
            </div>
            <div className="divide-y divide-border">
              {[
                { label: "Plano", value: subscription.snapshotPlanName },
                { label: "Status", value: (
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${BILLING_STATUS_STYLE[subscription.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {BILLING_STATUS_LABELS[subscription.status] ?? subscription.status}
                  </span>
                )},
                { label: "Valor", value: `${(subscription.snapshotPriceInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })  } / ${  subscription.snapshotInterval}` },
                { label: "Max. colaboradores", value: subscription.snapshotMaxEmployees },
                { label: "Periodo atual", value: `${format(subscription.currentPeriodStart, "dd/MM/yyyy")  } ate ${  format(subscription.currentPeriodEnd, "dd/MM/yyyy")}` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-medium">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3">
              <ManageSubscriptionButton />
            </div>
          </div>
        ) : (
          <div className="border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest">Nenhuma assinatura ativa</span>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-4">Escolha um plano para ativar sua conta:</p>
              <div className="grid gap-0 border border-border">
                {plans.map((plan, i) => (
                  <div key={plan.id} className={i < plans.length - 1 ? "border-b border-border" : ""}>
                    <PlanCard
                      externalPriceId={plan.prices[0]?.externalPriceId ?? null}
                      planName={plan.name}
                      priceLabel={plan.prices[0] ? `${(plan.prices[0].priceInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })  }/mes` : "—"}
                      maxEmployees={plan.maxEmployees}
                      description={plan.description}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
