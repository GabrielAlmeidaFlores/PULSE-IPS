import { FilterBar, type FilterField } from "@/libs/design-system"

interface ConfigOption {
  id: string
  name: string
  departmentName: string
}

interface SurveyFilters {
  status?: string
  dateFrom?: string
  dateTo?: string
  configId?: string
}

interface HealthSurveyListFiltersProps {
  filters: SurveyFilters
  configs: ConfigOption[]
}

const SURVEY_STATUS_OPTIONS = [
  { value: "scheduled", label: "Agendado" },
  { value: "available", label: "Disponível" },
  { value: "failed", label: "Falhou" },
  { value: "cancelled", label: "Cancelado" },
]

export function HealthSurveyListFilters({ filters, configs }: HealthSurveyListFiltersProps): React.ReactElement {
  const configOptions = configs.map((c) => ({
    value: c.id,
    label: `${c.name} — ${c.departmentName}`,
  }))

  const fields: FilterField[] = [
    {
      type: "select",
      key: "configId",
      label: "Tipo de pesquisa",
      width: "w-[220px]",
      options: configOptions,
      allLabel: "Todas",
    },
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

  return (
    <FilterBar
      fields={fields}
      values={{
        configId: filters.configId,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }}
    />
  )
}
