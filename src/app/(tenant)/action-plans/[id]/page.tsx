import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getActionPlan } from "@/modules/action-plans/action-plan.service"
import { TaskControls } from "@/app/(tenant)/action-plans/[id]/task-controls"
import { CompletePlanButton } from "@/app/(tenant)/action-plans/[id]/complete-plan-button"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ActionPlanDetailPage({ params }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const { id } = await params
  const plan = await getActionPlan(session.tenantId, id)
  if (!plan) redirect("/action-plans")

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/action-plans" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Planos de Ação</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest">{plan.title}</h1>
            {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground bg-muted">
              {plan.priority}
            </span>
            <CompletePlanButton planId={plan.id} currentStatus={plan.status} />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest">Tarefas ({plan.tasks.length})</span>
          </div>
          <TaskControls planId={plan.id} tasks={plan.tasks} />
        </div>
      </div>
    </div>
  )
}
