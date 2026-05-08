import { FilterBar, type FilterField } from "@/libs/design-system"

interface EmployeeFilters {
  q?: string
  departmentId?: string
  status?: string
  consent?: string
}

interface DepartmentOption {
  id: string
  name: string
}

interface Props {
  filters: EmployeeFilters
  departments: DepartmentOption[]
}

const EMPLOYEE_STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
  { value: "inactive", label: "Inativo" },
]

const EMPLOYEE_CONSENT_OPTIONS = [
  { value: "accepted", label: "Aceito" },
  { value: "refused", label: "Recusado" },
  { value: "opt_out", label: "Opt-out" },
  { value: "not_sent", label: "Não enviado" },
]

export function EmployeeListFilters({ filters, departments }: Props): React.ReactElement {
  const fields: FilterField[] = [
    {
      type: "text",
      key: "q",
      label: "Buscar",
      placeholder: "Nome do colaborador...",
      width: "w-[220px]",
    },
    {
      type: "select",
      key: "departmentId",
      label: "Departamento",
      width: "w-[180px]",
      options: departments.map((d) => ({ value: d.id, label: d.name })),
      allLabel: "Todos",
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      width: "w-[130px]",
      options: EMPLOYEE_STATUS_OPTIONS,
      allLabel: "Todos",
    },
    {
      type: "select",
      key: "consent",
      label: "Consentimento",
      width: "w-[150px]",
      options: EMPLOYEE_CONSENT_OPTIONS,
      allLabel: "Todos",
    },
  ]

  const values: Record<string, string | undefined> = {
    q: filters.q,
    departmentId: filters.departmentId,
    status: filters.status,
    consent: filters.consent,
  }

  return <FilterBar fields={fields} values={values} />
}
