import { BADGE_BASE, BADGE_AMBER, BADGE_GREEN, BADGE_RED } from "@/libs/design-system/alert-labels"
import { adherenceRateBarClass, adherenceRateTextColor } from "@/libs/utils/health-index"
import {
  CLIMATE_SURVEY_ADHERENCE_CHANNEL_LABELS,
  type ClimateSurveyAdherenceChannelComparison,
  type ClimateSurveyAdherenceDepartmentRow,
  type ClimateSurveyAdherenceStatusLabel,
} from "@/modules/climate-surveys/climate-survey.types"

function statusBadgeClass(status: ClimateSurveyAdherenceStatusLabel): string {
  if (status === "Excelente") return BADGE_GREEN
  if (status === "Boa") return BADGE_AMBER
  return BADGE_RED
}

function formatChannels(channels: ClimateSurveyAdherenceDepartmentRow["channels"]): string {
  if (channels.length === 0) return "—"
  return channels.map((channel) => CLIMATE_SURVEY_ADHERENCE_CHANNEL_LABELS[channel]).join(" · ")
}

interface TableProps {
  rows: ClimateSurveyAdherenceDepartmentRow[]
}

export function ClimateSurveyAdherenceDepartmentTable({ rows }: TableProps): React.ReactElement {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-10">Nenhum departamento nesta onda.</p>
  }

  return (
    <div className="border border-border bg-card overflow-x-auto">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Nome da área
            </th>
            <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Total de colaboradores
            </th>
            <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Total de respostas
            </th>
            <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              % adesão
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Canal utilizado
            </th>
            <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.departmentId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium text-foreground">{row.departmentName}</td>
              <td className="px-4 py-3 text-center tabular-nums text-foreground">{row.totalEmployees}</td>
              <td className="px-4 py-3 text-center tabular-nums text-foreground">{row.totalResponses}</td>
              <td className={`px-4 py-3 text-center tabular-nums font-bold ${adherenceRateTextColor(row.adherencePercent)}`}>
                {row.adherencePercent}%
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatChannels(row.channels)}</td>
              <td className="px-4 py-3 text-center">
                <span className={`${BADGE_BASE} ${statusBadgeClass(row.statusLabel)}`}>{row.statusLabel}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface ChannelProps {
  channels: ClimateSurveyAdherenceChannelComparison[]
}

export function ClimateSurveyAdherenceChannelComparisonCards({ channels }: ChannelProps): React.ReactElement {
  if (channels.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Nenhum canal configurado nesta onda.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {channels.map((channel) => (
        <div key={channel.channel} className="border border-border bg-card px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{channel.label}</p>
          <p className={`text-3xl font-bold tabular-nums mt-2 ${adherenceRateTextColor(channel.adherencePercent)}`}>
            {channel.adherencePercent}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {channel.totalResponses} de {channel.totalRecipients} respondentes
          </p>
          <div className="mt-3 h-1.5 bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${adherenceRateBarClass(channel.adherencePercent)}`}
              style={{ width: `${String(Math.min(channel.adherencePercent, 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
