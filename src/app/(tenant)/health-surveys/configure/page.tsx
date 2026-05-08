import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getHealthSurveyConfigs } from "@/modules/health-surveys/health-survey-config.service"
import { getActiveDepartments } from "@/modules/departments/department.service"
import { DeactivateHealthSurveyGroupButton } from "@/app/(tenant)/health-surveys/configure/deactivate-health-survey-group-button"
import { HealthSurveyConfigListFilters } from "@/app/(tenant)/health-surveys/configure/health-survey-config-list-filters"
import { DataTable } from "@/libs/design-system"
import { Plus, Settings2, Pencil } from "lucide-react"

interface ConfigureHealthSurveyListPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diária",
  twice_weekly: "2× por semana",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
}

const COLUMNS = [
  { label: "Pesquisa" },
  { label: "Setores" },
  { label: "Frequência" },
  { label: "Disparo" },
  { label: "Perguntas", align: "center" as const },
  { label: "" },
]

export default async function ConfigureHealthSurveyListPage({ searchParams }: ConfigureHealthSurveyListPageProps): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams

  const [configs, departments] = await Promise.all([
    getHealthSurveyConfigs(session.tenantId),
    getActiveDepartments(session.tenantId),
  ])

  const hasFilters = params["q"] !== undefined || params["frequency"] !== undefined || params["departmentId"] !== undefined

  const total = configs.length

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest">Configurar Pesquisas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} {total === 1 ? "pesquisa configurada" : "pesquisas configuradas"}
          </p>
        </div>
        <Link
          href="/health-surveys/configure/new"
          className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          style={{ borderRadius: 0 }}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova pesquisa
        </Link>
      </div>

      <div className="border-b border-border bg-card px-6 py-2.5 shrink-0">
        <HealthSurveyConfigListFilters departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {total === 0 && !hasFilters && (
          <div className="border border-dashed border-border bg-card px-6 py-12 text-center">
            <Settings2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">Nenhuma pesquisa configurada</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Crie uma pesquisa para começar a monitorar a saúde ocupacional dos colaboradores.</p>
            <Link
              href="/health-surveys/configure/new"
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
          >
            {configs.map((config) => {
              const depts = config.configDepartments.map((cd) => cd.department)
              return (
                <tr key={config.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-semibold text-foreground">{config.name}</span>
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
                        href={`/health-surveys/configure/${config.id}`}
                        className="flex items-center gap-1 px-2 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        style={{ borderRadius: 0 }}
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </Link>
                      <DeactivateHealthSurveyGroupButton configId={config.id} configName={config.name} />
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
