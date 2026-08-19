import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getClimateSurveyConfigsPaginated } from "@/modules/climate-surveys/climate-survey-config.service"
import { getActiveDepartments } from "@/modules/departments/department.service"
import { DeactivateClimateSurveyGroupButton } from "@/app/(tenant)/climate-surveys/configure/deactivate-climate-survey-group-button"
import { ClimateSurveyConfigListFilters } from "@/app/(tenant)/climate-surveys/configure/climate-survey-config-list-filters"
import { DataTable, TablePagination } from "@/libs/design-system"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { Plus, Settings2, Pencil } from "lucide-react"

interface ConfigureClimateSurveyListPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

const FREQUENCY_LABELS: Record<string, string> = {
  once: "Pesquisa única",
  daily: "Diária",
  twice_weekly: "2× por semana",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
}

const COLUMNS = [
  { label: "Pesquisa" },
  { label: "Setores" },
  { label: "Frequência" },
  { label: "Disparo" },
  { label: "Perguntas", align: "center" as const },
  { label: "" },
]

export default async function ConfigureClimateSurveyListPage({ searchParams }: ConfigureClimateSurveyListPageProps): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard")

  const params = await searchParams
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])

  const query: { page: number; pageSize: number; q?: string; frequency?: string; departmentId?: string } = { page, pageSize }
  if (params["q"] !== undefined) query.q = params["q"]
  if (params["frequency"] !== undefined) query.frequency = params["frequency"]
  if (params["departmentId"] !== undefined) query.departmentId = params["departmentId"]

  const hasFilters = params["q"] !== undefined || params["frequency"] !== undefined || params["departmentId"] !== undefined

  const [{ items: configs, total }, departments] = await Promise.all([
    getClimateSurveyConfigsPaginated(session.tenantId, query),
    getActiveDepartments(session.tenantId),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <Link href="/climate-surveys" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Pesquisa de Clima</Link>
          <h1 className="text-sm font-bold uppercase tracking-widest mt-2">Banco de Perguntas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} {total === 1 ? "pesquisa configurada" : "pesquisas configuradas"}
          </p>
        </div>
        <Link
          href="/climate-surveys/configure/new"
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full sm:w-auto"
          style={{ borderRadius: 0 }}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova pesquisa
        </Link>
      </div>

      <div className="border-b border-border bg-card px-6 py-2.5 shrink-0">
        <ClimateSurveyConfigListFilters departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {total === 0 && !hasFilters && (
          <div className="border border-dashed border-border bg-card px-6 py-12 text-center">
            <Settings2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">Nenhuma pesquisa configurada</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Crie uma pesquisa para começar a monitorar o clima organizacional dos colaboradores.</p>
            <Link
              href="/climate-surveys/configure/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              style={{ borderRadius: 0 }}
            >
              <Plus className="h-3.5 w-3.5" />
              Criar primeira pesquisa
            </Link>
          </div>
        )}

        {(total > 0 || hasFilters) && (
          <DataTable
            columns={COLUMNS}
            total={total}
            emptyMessage="Nenhuma pesquisa encontrada com os filtros aplicados."
            pagination={<TablePagination total={total} />}
          >
            {configs.map((config) => {
              const depts = config.configDepartments.map((cd) => cd.department)
              return (
                <tr key={config.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">{config.name}</span>
                    {config.description !== null && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-xs">{config.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {depts.map((dept) => (
                        <span key={dept.id} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
                          {dept.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-foreground">
                    {FREQUENCY_LABELS[config.frequency] ?? config.frequency}
                    {config.frequency === "monthly" && config.scheduledDayOfMonth !== null
                      ? ` · dia ${config.scheduledDayOfMonth}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {config.dispatchTime}
                  </td>
                  <td className="px-4 py-3 text-center text-[12px] text-muted-foreground">
                    {config.questions.length}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/climate-surveys/configure/${config.id}`}
                        className="flex items-center gap-1 px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        style={{ borderRadius: 0 }}
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </Link>
                      <DeactivateClimateSurveyGroupButton configId={config.id} configName={config.name} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </DataTable>
        )}
      </div>
    </div>
  )
}
