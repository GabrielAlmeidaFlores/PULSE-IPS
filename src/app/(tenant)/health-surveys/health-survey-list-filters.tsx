import { FilterBar, type FilterField } from "@/libs/design-system"

interface SurveyFilters {
  status?: string
  dateFrom?: string
  dateTo?: string
}

interface HealthSurveyListFiltersProps {
  filters: SurveyFilters
}

const SURVEY_STATUS_OPTIONS = [
  { value: "scheduled", label: "Agendado" },
  { value: "available", label: "Disponível" },
  { value: "failed", label: "Falhou" },
  { value: "cancelled", label: "Cancelado" },
]

const SURVEY_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "status",
    label: "Status",
    width: "w-[150px]",
    options: SURVEY_STATUS_OPTIONS,
    allLabel: "Todos",
  },
  {
    type: "date",
    key: "dateFrom",
    label: "De",
  },
  {
    type: "date",
    key: "dateTo",
    label: "Até",
  },
]

export function HealthSurveyListFilters({ filters }: HealthSurveyListFiltersProps): React.ReactElement {
  return (
    <FilterBar
      fields={SURVEY_FILTER_FIELDS}
      values={{ status: filters.status, dateFrom: filters.dateFrom, dateTo: filters.dateTo }}
    />
  )
}
