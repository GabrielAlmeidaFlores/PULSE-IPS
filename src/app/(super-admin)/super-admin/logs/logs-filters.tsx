import React from "react"
import type { RequestLogFilters } from "@/modules/request-logs/request-log.types"
import { FilterBar, type FilterField } from "@/libs/design-system"

interface Props {
  filters: RequestLogFilters
}

const LOG_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "method",
    label: "Método",
    width: "w-[100px]",
    options: [
      { value: "GET", label: "GET" },
      { value: "POST", label: "POST" },
      { value: "PUT", label: "PUT" },
      { value: "PATCH", label: "PATCH" },
      { value: "DELETE", label: "DELETE" },
    ],
  },
  {
    type: "select",
    key: "statusGroup",
    label: "Status",
    width: "w-[160px]",
    options: [
      { value: "2xx", label: "2xx — Sucesso" },
      { value: "3xx", label: "3xx — Redirect" },
      { value: "4xx", label: "4xx — Erro cliente" },
      { value: "5xx", label: "5xx — Erro servidor" },
    ],
  },
  {
    type: "select",
    key: "userType",
    label: "Usuário",
    width: "w-[160px]",
    options: [
      { value: "org_user", label: "Usuário da org" },
      { value: "super_admin", label: "Super Admin" },
      { value: "anonymous", label: "Anônimo" },
    ],
  },
  {
    type: "text",
    key: "path",
    label: "Caminho",
    placeholder: "/api/...",
    width: "w-[220px]",
    mono: true,
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

export function LogsFilters({ filters }: Props): React.ReactElement {
  const values: Record<string, string | undefined> = {
    method: filters.method,
    statusGroup: filters.statusGroup,
    userType: filters.userType,
    path: filters.pathContains,
    dateFrom: filters.dateFrom !== undefined ? filters.dateFrom.toISOString().slice(0, 10) : undefined,
    dateTo: filters.dateTo !== undefined ? filters.dateTo.toISOString().slice(0, 10) : undefined,
  }

  return <FilterBar fields={LOG_FILTER_FIELDS} values={values} />
}
