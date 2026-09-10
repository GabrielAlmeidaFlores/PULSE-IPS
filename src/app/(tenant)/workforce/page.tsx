import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getWorkforceDashboard } from "@/modules/workforce/workforce.service"
import { ChartCard } from "@/components/chart-card"
import { FilterBar } from "@/libs/design-system"
import { WorkforceEvolutionChart } from "@/app/(tenant)/workforce/components/workforce-evolution-chart"

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

function formatCompetenciaLabel(competencia: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(competencia)
  if (match === null) return competencia
  const year = match[1]
  const month = match[2]
  if (year === undefined || month === undefined) return competencia
  return `${month}/${year}`
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`
}

export default async function WorkforcePage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const competencia = params["competencia"]
  const dashboard = await getWorkforceDashboard(session.tenantId, competencia)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest">Indicadores de Pessoas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Headcount, turnover e absenteísmo por competência e setor
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/workforce/insights"
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              style={{ borderRadius: 0 }}
            >
              Análise com IA
            </Link>
            <Link
              href="/workforce/import"
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              style={{ borderRadius: 0 }}
            >
              Importar dados
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {dashboard.selectedCompetencia === null ? (
          <div className="border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhum dado importado ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Importe um arquivo de ponto/planilha para visualizar headcount, turnover e absenteísmo.
            </p>
          </div>
        ) : (
          <>
            <FilterBar
              fields={[
                {
                  type: "select",
                  key: "competencia",
                  label: "Competência",
                  width: "w-[180px]",
                  options: dashboard.competencias.map((value) => ({
                    value,
                    label: formatCompetenciaLabel(value),
                  })),
                },
              ]}
              values={{
                ...(params["competencia"] !== undefined ? { competencia: params["competencia"] } : {}),
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <div className="border border-border bg-card px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Headcount</p>
                <p className="text-3xl font-bold tabular-nums mt-2 text-foreground">{dashboard.kpis.headcount}</p>
                <p className="text-[11px] text-muted-foreground mt-1">colaboradores ativos</p>
              </div>
              <div className="border border-border bg-card px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admissões</p>
                <p className="text-3xl font-bold tabular-nums mt-2 text-foreground">{dashboard.kpis.admissions}</p>
                <p className="text-[11px] text-muted-foreground mt-1">no mês</p>
              </div>
              <div className="border border-border bg-card px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Desligamentos</p>
                <p className="text-3xl font-bold tabular-nums mt-2 text-foreground">{dashboard.kpis.terminations}</p>
                <p className="text-[11px] text-muted-foreground mt-1">no mês</p>
              </div>
              <div className="border border-border bg-card px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Turnover</p>
                <p className="text-3xl font-bold tabular-nums mt-2 text-foreground">
                  {formatPercent(dashboard.kpis.turnoverPercent)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">desligamentos / headcount</p>
              </div>
              <div className="border border-border bg-card px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Absenteísmo</p>
                <p className="text-3xl font-bold tabular-nums mt-2 text-foreground">
                  {formatPercent(dashboard.kpis.absenteeismPercent)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {dashboard.kpis.absentHours}h ausentes de {dashboard.kpis.expectedHours}h
                </p>
              </div>
            </div>

            <ChartCard title="Evolução entre competências" subtitle="Headcount, turnover e absenteísmo">
              <WorkforceEvolutionChart points={dashboard.evolution} />
            </ChartCard>

            <div className="border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Por setor · {formatCompetenciaLabel(dashboard.selectedCompetencia)}
                </p>
              </div>
              {dashboard.departments.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-bold text-muted-foreground">Sem dados por setor</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Setor</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Headcount</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Admissões</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32">Desligamentos</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">Turnover</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32">Absenteísmo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.departments.map((row, index) => (
                        <tr
                          key={row.departmentName}
                          className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${index % 2 !== 0 ? "bg-muted/10" : ""}`}
                        >
                          <td className="px-4 py-3 text-xs font-medium text-foreground">{row.departmentName}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-foreground">{row.headcount}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{row.admissions}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{row.terminations}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatPercent(row.turnoverPercent)}</td>
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatPercent(row.absenteeismPercent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
