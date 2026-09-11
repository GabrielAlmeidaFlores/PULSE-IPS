import { redirect } from "next/navigation"
import Link from "next/link"
import { formatInTimeZone } from "date-fns-tz"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import { getClimateSurveyWaveReports, type ClimateSurveyWaveReportRow } from "@/modules/climate-surveys/climate-survey-reports.service"
import { resolveClimateSurveyAdherenceStatusLabel } from "@/modules/climate-surveys/climate-survey.types"
import { ClimateSurveyWaveReportActions } from "@/app/(tenant)/climate-surveys/reports/climate-survey-wave-report-actions"
import { DataTable, TablePagination } from "@/libs/design-system"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { BADGE_AMBER, BADGE_BASE, BADGE_GREEN } from "@/libs/design-system/alert-labels"
import { ChevronRight } from "lucide-react"

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  available: "Em campo",
  failed: "Falhou",
  cancelled: "Cancelada",
}

function adherenceBadgeClass(percent: number): string {
  const status = resolveClimateSurveyAdherenceStatusLabel(percent)
  if (status === "Excelente") return BADGE_GREEN
  if (status === "Boa") return BADGE_GREEN
  return BADGE_AMBER
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`
}

function formatEnps(value: number | null): string {
  if (value === null) return "—"
  return value > 0 ? `+${value}` : String(value)
}

function formatPeriod(row: ClimateSurveyWaveReportRow, timezone: string): string {
  const scheduled = formatInTimeZone(row.scheduledAt, timezone, "dd/MM/yyyy")
  if (row.dispatchedAt === null) return scheduled
  return `${scheduled} – ${formatInTimeZone(row.dispatchedAt, timezone, "dd/MM/yyyy")}`
}

export default async function ClimateSurveyReportsPage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard")

  const params = await searchParams
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])
  const [{ items, total }, org] = await Promise.all([
    getClimateSurveyWaveReports(session.tenantId, { page, pageSize }),
    getOrganization(session.tenantId),
  ])
  const timezone = org?.timezone ?? "America/Sao_Paulo"

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/climate-surveys" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Pesquisa de Clima
        </Link>
        <div className="mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">Banco de relatórios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Histórico das ondas de clima já rodadas, com exportação em PDF e duplicação da configuração
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {total === 0 ? (
          <div className="border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhuma onda rodada ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Dispare uma pesquisa de clima para que ela apareça aqui.
            </p>
          </div>
        ) : (
          <DataTable
            columns={[
              { label: "Onda" },
              { label: "Período", className: "w-40" },
              { label: "Público", className: "w-32" },
              { label: "Adesão", className: "w-28" },
              { label: "Favorabilidade", className: "w-32" },
              { label: "eNPS", className: "w-24" },
              { label: "Ações", className: "w-28" },
              { label: "", className: "w-8" },
            ]}
            total={total}
            pagination={<TablePagination total={total} />}
            minWidth={900}
          >
            {items.map((row, index) => (
              <tr
                key={row.dispatchId}
                className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors group ${index % 2 !== 0 ? "bg-muted/10" : ""}`}
              >
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-foreground">
                    Onda {row.waveNumber} · {row.configName}
                  </span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                  {formatPeriod(row, timezone)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                  {row.totalRecipients} colaboradores
                </td>
                <td className="px-4 py-3">
                  <span className={`${BADGE_BASE} ${adherenceBadgeClass(row.adherencePercent)}`}>
                    {row.adherencePercent}%
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-medium text-foreground tabular-nums">
                  {formatPercent(row.favorabilityPercent)}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-foreground tabular-nums">
                  {formatEnps(row.enps)}
                </td>
                <td className="px-3 py-3">
                  <ClimateSurveyWaveReportActions dispatchId={row.dispatchId} configId={row.configId} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Link href={`/climate-surveys/${row.dispatchId}`} className="block">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-auto" />
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </div>
  )
}
