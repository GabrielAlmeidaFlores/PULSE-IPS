"use client"

import { FilterBar, type FilterField } from "@/libs/design-system"

interface PgrListFiltersProps {
  currentYear?: string | undefined
  currentStatus?: string | undefined
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = String(CURRENT_YEAR - i)
  return { value: y, label: y }
})

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "generated", label: "Gerado" },
  { value: "reviewed", label: "Revisado" },
]

const PGR_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "year",
    label: "Ano",
    width: "w-[120px]",
    options: YEAR_OPTIONS,
    allLabel: "Todos",
  },
  {
    type: "select",
    key: "status",
    label: "Status",
    width: "w-[150px]",
    options: STATUS_OPTIONS,
    allLabel: "Todos",
  },
]

export function PgrListFilters({ currentYear, currentStatus }: PgrListFiltersProps): React.ReactElement {
  return (
    <FilterBar
      fields={PGR_FILTER_FIELDS}
      values={{ year: currentYear, status: currentStatus }}
    />
  )
}
