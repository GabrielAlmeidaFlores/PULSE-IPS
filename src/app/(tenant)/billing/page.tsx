import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getSubscription, getTenantPlanFeatures } from "@/modules/billing/billing.service"
import { getAllPlans } from "@/modules/plans/plan.service"
import { ALL_PLAN_FEATURES, PLAN_FEATURE_LABELS } from "@/modules/plans/plan.types"
import { format } from "date-fns"
import { CheckCircle2 } from "lucide-react"
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
  trialing: "badge-warning",
  past_due: "bg-destructive/10 text-destructive border-destructive/20",
  canceled: "bg-destructive/10 text-destructive border-destructive/20",
  paused: "bg-muted text-muted-foreground border-border",
  unpaid: "bg-destructive/10 text-destructive border-destructive/20",
}

export default async function BillingPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "admin") redirect("/dashboard")

  const [subscription, plans, activeFeatures] = await Promise.all([
    getSubscription(session.tenantId),
    getAllPlans(),
    getTenantPlanFeatures(session.tenantId),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm font-bold uppercase tracking-widest">Assinatura</h1>
          <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Assinatura e faturamento</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Gerenciamento completo da assinatura da sua empresa. Exibe o plano ativo, o limite de colaboradores incluídos, a data de renovação e o histórico de faturas. Disponível apenas para o <strong>administrador</strong> da conta.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">O que você pode fazer</p>
                  <ul className="text-[12px] text-foreground leading-relaxed space-y-1 list-none">
                    <li>📋 <strong>Ver plano atual</strong> — limite de colaboradores, validade, valor</li>
                    <li>⬆️ <strong>Upgrade/downgrade</strong> — mudar para outro plano</li>
                    <li>💳 <strong>Atualizar cartão</strong> — trocar o método de pagamento</li>
                    <li>🧾 <strong>Baixar faturas</strong> — exportar notas para o financeiro</li>
                    <li>❌ <strong>Cancelar</strong> — encerrar a assinatura (acesso mantido até o fim do período pago)</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status de pagamento</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Se uma cobrança falhar, o status muda para <strong>Em atraso</strong> e aparece um aviso no painel. Após novo período sem pagamento, o acesso é suspenso até a regularização.</p>
                </div>
              </div>
            } />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Gerenciamento de plano e faturamento</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {subscription ? (
          <>
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
                { label: "Período atual", value: `${format(subscription.currentPeriodStart, "dd/MM/yyyy")  } até ${  format(subscription.currentPeriodEnd, "dd/MM/yyyy")}` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-medium">{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funcionalidades</span>
                <div className="flex items-center gap-3">
                  {ALL_PLAN_FEATURES.map((feature) => {
                    const enabled = activeFeatures.includes(feature)
                    return (
                      <span key={feature} className={`flex items-center gap-1 text-[11px] ${enabled ? "text-foreground" : "text-muted-foreground/50 line-through"}`}>
                        {enabled && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
                        {PLAN_FEATURE_LABELS[feature]}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="px-4 py-3">
              <ManageSubscriptionButton />
            </div>
          </div>

          {plans.length > 0 && (
            <div className="border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest">Trocar de plano</span>
              </div>
              <div className="divide-y divide-border">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    externalPriceId={plan.prices[0]?.externalPriceId ?? null}
                    planName={plan.name}
                    priceLabel={plan.prices[0] ? `${(plan.prices[0].priceInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês` : "—"}
                    maxEmployees={plan.maxEmployees}
                    description={plan.description}
                    features={plan.features}
                    isCurrent={plan.id === subscription.plan.id}
                  />
                ))}
              </div>
            </div>
          )}
          </>
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
                      priceLabel={plan.prices[0] ? `${(plan.prices[0].priceInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })  }/mês` : "—"}
                      maxEmployees={plan.maxEmployees}
                      description={plan.description}
                      features={plan.features}
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
