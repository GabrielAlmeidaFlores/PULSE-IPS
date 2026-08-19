import { redirect } from "next/navigation"
import Link from "next/link"
import { formatInTimeZone } from "date-fns-tz"
import { getSession } from "@/modules/auth/session"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import { getClimateSurveyAdherenceOverview } from "@/modules/climate-surveys/climate-survey-adherence.service"
import { getOrganization } from "@/modules/organizations/organization.service"
import { PageHelp } from "@/components/page-help"
import { ChartCard } from "@/components/chart-card"
import {
  ClimateSurveyAdherenceChannelComparisonCards,
  ClimateSurveyAdherenceDepartmentTable,
} from "@/app/(tenant)/climate-surveys/adherence/climate-survey-adherence-table"
import { ClimateSurveyAdherenceReminderCard } from "@/app/(tenant)/climate-surveys/adherence/climate-survey-adherence-reminder-card"
import {
  CLIMATE_SURVEY_ADHERENCE_EXCELLENT_THRESHOLD_PERCENT,
  CLIMATE_SURVEY_ADHERENCE_REINFORCE_THRESHOLD_PERCENT,
} from "@/modules/climate-surveys/climate-survey.types"
import { adherenceRateTextColor } from "@/libs/utils/health-index"

export default async function ClimateSurveyAdherencePage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard")

  const [overview, org] = await Promise.all([
    getClimateSurveyAdherenceOverview(session.tenantId),
    getOrganization(session.tenantId),
  ])

  const timezone = org?.timezone ?? "America/Sao_Paulo"
  const wave = overview.wave

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold uppercase tracking-widest">Adesão — Pesquisa de Clima</h1>
              <PageHelp
                content={
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                      <p className="text-[12px] text-foreground leading-relaxed">
                        Excelente ≥ {CLIMATE_SURVEY_ADHERENCE_EXCELLENT_THRESHOLD_PERCENT}% · Boa ≥ {CLIMATE_SURVEY_ADHERENCE_REINFORCE_THRESHOLD_PERCENT}% · Reforçar &lt; {CLIMATE_SURVEY_ADHERENCE_REINFORCE_THRESHOLD_PERCENT}%.
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Canais</p>
                      <p className="text-[12px] text-foreground leading-relaxed">
                        Mensagem = envio automático. E-mail = distribuição via link assinado (e-mail, intranet etc.).
                      </p>
                    </div>
                  </div>
                }
              />
            </div>
            {wave !== null ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Onda: <span className="text-foreground font-medium">{wave.configName}</span>
                {" · "}
                {formatInTimeZone(wave.dispatchedAt ?? wave.scheduledAt, timezone, "dd/MM/yyyy HH:mm")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Nenhuma onda ativa no momento</p>
            )}
          </div>
          {wave !== null && (
            <Link
              href={`/climate-surveys/${wave.id}`}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-center"
              style={{ borderRadius: 0 }}
            >
              Ver onda
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {wave === null ? (
          <div className="border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Sem dados de adesão</p>
            <p className="text-xs text-muted-foreground mt-1">
              Dispare uma onda em Disparo &amp; Canais para acompanhar a adesão por área.
            </p>
            <Link
              href="/climate-surveys/dispatches"
              className="inline-block mt-4 px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              style={{ borderRadius: 0 }}
            >
              Ir para disparos
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-border bg-card px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adesão geral</p>
                <p className={`text-3xl font-bold tabular-nums mt-2 ${adherenceRateTextColor(wave.adherencePercent)}`}>
                  {wave.adherencePercent}%
                </p>
              </div>
              <div className="border border-border bg-card px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Colaboradores</p>
                <p className="text-3xl font-bold tabular-nums mt-2 text-foreground">{wave.totalRecipients}</p>
              </div>
              <div className="border border-border bg-card px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Respostas</p>
                <p className="text-3xl font-bold tabular-nums mt-2 text-foreground">{wave.totalResponses}</p>
              </div>
            </div>

            <ClimateSurveyAdherenceReminderCard
              dispatchId={wave.id}
              reminderAreas={overview.reminderAreas}
              canSendReminderNow={overview.canSendReminderNow}
              pendingReminderCount={wave.pendingReminderCount}
            />

            <ChartCard title="Adesão por departamento" subtitle="Status: Excelente, Boa ou Reforçar">
              <ClimateSurveyAdherenceDepartmentTable rows={overview.departments} />
            </ChartCard>

            <ChartCard
              title="Comparação por canal"
              subtitle="Mensagem (envio automático) × E-mail (link assinado)"
            >
              <ClimateSurveyAdherenceChannelComparisonCards channels={overview.channelComparison} />
            </ChartCard>
          </>
        )}
      </div>
    </div>
  )
}
