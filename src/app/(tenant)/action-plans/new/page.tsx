import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { CreateActionPlanForm } from "@/app/(tenant)/action-plans/new/create-action-plan-form"

export default async function NewActionPlanPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const hasFeature = await hasTenantPlanFeature(session.tenantId, "action_plans")
  if (!hasFeature) redirect("/dashboard")

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <h1 className="text-sm font-bold uppercase tracking-widest">Novo Plano de Ação</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Preencha os dados abaixo para criar um plano</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <CreateActionPlanForm />
      </div>
    </div>
  )
}
