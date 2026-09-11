import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Clock3, AlertTriangle } from "lucide-react"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getClimateSurveyActionPlanBoard } from "@/modules/climate-surveys/climate-survey-action-plan.service"
import { getPendingClimateSurveyActionSuggestions } from "@/modules/climate-surveys/climate-survey-action-suggestion.service"
import { FilterBar } from "@/libs/design-system"
import { ClimateSurveyActionPlanBoardClient } from "@/app/(tenant)/climate-surveys/action-plans/climate-survey-action-plan-board-client"
import { ClimateSurveyActionSuggestionCards } from "@/app/(tenant)/climate-surveys/action-plans/climate-survey-action-suggestion-cards"
import { getOrganization } from "@/modules/organizations/organization.service"
import { formatInTimeZone } from "date-fns-tz"

export default async function ClimateSurveyActionPlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard")
  if (!(await hasTenantPlanFeature(session.tenantId, "action_plans"))) redirect("/climate-surveys")

  const params = await searchParams
  const boardFilters: { status?: string; priority?: string; assigneeId?: string; dimension?: string } = {}
  if (params["status"] !== undefined) boardFilters.status = params["status"]
  if (params["priority"] !== undefined) boardFilters.priority = params["priority"]
  if (params["assigneeId"] !== undefined) boardFilters.assigneeId = params["assigneeId"]
  if (params["dimension"] !== undefined) boardFilters.dimension = params["dimension"]

  const [board, org, suggestions] = await Promise.all([
    getClimateSurveyActionPlanBoard(session.tenantId, boardFilters),
    getOrganization(session.tenantId),
    getPendingClimateSurveyActionSuggestions(session.tenantId),
  ])

  const timezone = org?.timezone ?? "America/Sao_Paulo"
  const waveLabel =
    board.wave !== null
      ? `${board.wave.configName} · ${formatInTimeZone(board.wave.scheduledAt, timezone, "dd/MM/yyyy")}`
      : "Sem onda ativa"

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/climate-surveys" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Pesquisa de Clima
        </Link>
        <div className="mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">Plano de Ação</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ações vinculadas à pesquisa de clima · {waveLabel}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-border bg-card">
          <div className="px-5 py-4 border-b sm:border-b-0 sm:border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Concluídas
              </p>
            </div>
            <p className="text-3xl font-black text-status-success">{board.indicators.completed}</p>
          </div>
          <div className="px-5 py-4 border-b sm:border-b-0 sm:border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <Clock3 className="w-3.5 h-3.5 text-status-warning" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Em andamento
              </p>
            </div>
            <p className="text-3xl font-black text-status-warning">{board.indicators.inProgress}</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-status-danger" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Atrasadas
              </p>
            </div>
            <p className="text-3xl font-black text-status-danger">{board.indicators.overdue}</p>
          </div>
        </div>

        <FilterBar
          fields={[
            {
              type: "select",
              key: "status",
              label: "Status",
              width: "w-[160px]",
              options: [
                { value: "open", label: "Planejado" },
                { value: "in_progress", label: "Em andamento" },
                { value: "completed", label: "Concluído" },
              ],
            },
            {
              type: "select",
              key: "priority",
              label: "Prioridade",
              width: "w-[160px]",
              options: [
                { value: "high", label: "Alta" },
                { value: "medium", label: "Média" },
                { value: "low", label: "Baixa" },
              ],
            },
            {
              type: "select",
              key: "dimension",
              label: "Tópico",
              width: "w-[220px]",
              options: board.topics.map((topic) => ({
                value: topic.key,
                label: topic.label,
              })),
            },
            {
              type: "select",
              key: "assigneeId",
              label: "Responsável",
              width: "w-[220px]",
              options: board.assignees.map((assignee) => ({
                value: assignee.id,
                label: assignee.name,
              })),
            },
          ]}
          values={{
            ...(params["status"] !== undefined ? { status: params["status"] } : {}),
            ...(params["priority"] !== undefined ? { priority: params["priority"] } : {}),
            ...(params["dimension"] !== undefined ? { dimension: params["dimension"] } : {}),
            ...(params["assigneeId"] !== undefined ? { assigneeId: params["assigneeId"] } : {}),
          }}
        />

        <ClimateSurveyActionSuggestionCards suggestions={suggestions} />

        <ClimateSurveyActionPlanBoardClient
          belowGoalTopics={board.belowGoalTopics}
          actions={board.actions}
          assignees={board.assignees}
          topics={board.topics}
          waveId={board.wave?.id ?? null}
          corporateGoalPercent={board.corporateGoalPercent}
        />
      </div>
    </div>
  )
}
