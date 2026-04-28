import { FilterBar, type FilterField } from "@/libs/design-system"

interface AlertFilters {
  type?: string
  severity?: string
  status?: string
}

interface Props {
  filters: AlertFilters
}

const ALERT_TYPE_OPTIONS = [
  { value: "score_drop", label: "Queda no bem-estar" },
  { value: "low_score", label: "Bem-estar abaixo do esperado" },
  { value: "negative_trend", label: "Tendência de piora" },
  { value: "low_adherence", label: "Adesão baixa" },
  { value: "no_response", label: "Sem resposta" },
  { value: "consent_expired", label: "Consentimento expirado" },
  { value: "pgr_review_due", label: "Revisão PGR pendente" },
]

const ALERT_SEVERITY_OPTIONS = [
  { value: "critical", label: "Crítico" },
  { value: "warning", label: "Atenção" },
  { value: "info", label: "Informativo" },
]

const ALERT_STATUS_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "read", label: "Lido" },
  { value: "resolved", label: "Resolvido" },
]

const ALERT_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "type",
    label: "Tipo",
    width: "w-[200px]",
    options: ALERT_TYPE_OPTIONS,
    allLabel: "Todos",
  },
  {
    type: "select",
    key: "severity",
    label: "Severidade",
    width: "w-[150px]",
    options: ALERT_SEVERITY_OPTIONS,
    allLabel: "Todas",
  },
  {
    type: "select",
    key: "status",
    label: "Status",
    width: "w-[130px]",
    options: ALERT_STATUS_OPTIONS,
    allLabel: "Todos",
  },
]

export function AlertListFilters({ filters }: Props): React.ReactElement {
  return (
    <FilterBar
      fields={ALERT_FILTER_FIELDS}
      values={{ type: filters.type, severity: filters.severity, status: filters.status }}
    />
  )
}
