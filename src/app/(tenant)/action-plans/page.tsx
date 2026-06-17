import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getActionPlansPaginated } from "@/modules/action-plans/action-plan.service"
import { getPendingActionPlanSuggestions } from "@/modules/action-plans/action-plan-suggestion.service"
import { ActionPlanSuggestionCards } from "@/app/(tenant)/action-plans/action-plan-suggestion-cards"
import { PageHelp } from "@/components/page-help"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { DataTable, FilterBar, TablePagination } from "@/libs/design-system"

const PLAN_STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

const BADGE_DEFAULT = "bg-muted text-muted-foreground border-border"

const PLAN_STATUS_STYLE: Record<string, string> = {
  open: BADGE_DEFAULT,
  in_progress: "badge-warning",
  completed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
}

const PLAN_PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
}

const PLAN_PRIORITY_STYLE: Record<string, string> = {
  low: BADGE_DEFAULT,
  medium: "badge-warning",
  high: "bg-destructive/10 text-destructive border-destructive/20",
}

export default async function ActionPlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const hasFeature = await hasTenantPlanFeature(session.tenantId, "action_plans")
  if (!hasFeature) redirect("/dashboard")

  const params = await searchParams
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])

  const planQuery: { page: number; pageSize: number; q?: string; status?: string } = { page, pageSize }
  if (params["q"] !== undefined) planQuery.q = params["q"]
  if (params["status"] !== undefined) planQuery.status = params["status"]

  const [{ items: plans, total }, suggestions] = await Promise.all([
    getActionPlansPaginated(session.tenantId, planQuery),
    getPendingActionPlanSuggestions(session.tenantId),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Planos de Ação</h1>
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">O que são planos de ação?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Documento formal que registra as medidas adotadas pela empresa diante de um problema identificado — seja um alerta de queda de índice, um relato anônimo ou uma revisão periódica. São a <strong>prova de que a empresa agiu</strong> ao identificar um risco psicossocial.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Por que documentar?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Monitorar não basta — é preciso <strong>agir e documentar</strong>. Sem planos de ação registrados, não há como comprovar que a empresa respondeu aos problemas identificados. O histórico de ações é o que transforma dados em resultado real.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ciclo de vida</p>
                  <ul className="text-[12px] text-foreground leading-relaxed space-y-1 list-none">
                    <li>🔵 <strong>Aberto</strong> — problema identificado, ações ainda não iniciadas</li>
                    <li>🟡 <strong>Em andamento</strong> — medidas sendo executadas</li>
                    <li>🟢 <strong>Concluído</strong> — ações implementadas e situação normalizada</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Como criar</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Clique em <strong>Novo plano</strong>, vincule ao alerta ou relato correspondente, defina as tarefas com responsável e prazo. Os planos são incluídos automaticamente no relatório do PGR do período.</p>
                </div>
              </div>
            } />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{total} planos</p>
        </div>
        <Link href="/action-plans/new" className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors border border-primary text-center w-full sm:w-auto" style={{ borderRadius: 0 }}>Novo Plano</Link>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <ActionPlanSuggestionCards suggestions={suggestions} />
        <FilterBar
          fields={[
            { type: "text", key: "q", label: "Buscar", placeholder: "Título do plano...", width: "w-[240px]" },
            {
              type: "select",
              key: "status",
              label: "Status",
              width: "w-[160px]",
              options: [
                { value: "open", label: "Aberto" },
                { value: "in_progress", label: "Em andamento" },
                { value: "completed", label: "Concluído" },
              ],
            },
          ]}
          values={{ q: params["q"], status: params["status"] }}
        />
        <DataTable
          columns={[
            { label: "Título" },
            { label: "Prioridade" },
            { label: "Status" },
            { label: "Tarefas", align: "right" },
            { label: "", align: "right", className: "w-8" },
          ]}
          total={total}
          emptyMessage="Nenhum plano de ação."
          pagination={<TablePagination total={total} />}
        >
          {plans.map((plan, i) => (
            <tr key={plan.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors group ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
              <td className="px-4 py-3 font-medium text-xs">
                <Link href={`/action-plans/${plan.id}`} className="hover:text-primary transition-colors">
                  {plan.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${PLAN_PRIORITY_STYLE[plan.priority] ?? BADGE_DEFAULT}`}>
                  {PLAN_PRIORITY_LABELS[plan.priority] ?? plan.priority}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${PLAN_STATUS_STYLE[plan.status] ?? BADGE_DEFAULT}`}>
                  {PLAN_STATUS_LABELS[plan.status] ?? plan.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">{plan.tasks.length}</td>
              <td className="px-3 py-3 text-right">
                <Link href={`/action-plans/${plan.id}`} className="block">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-auto" />
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  )
}
