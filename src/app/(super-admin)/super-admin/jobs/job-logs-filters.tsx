import type { JobLogFilters } from "@/modules/job-logs/job-log.types"
import { FilterBar, type FilterField } from "@/libs/design-system"
import React from "react"

interface Props {
  filters: JobLogFilters
}

const JOB_LOG_FILTER_FIELDS: FilterField[] = [
  {
    type: "select",
    key: "jobName",
    label: "Job",
    width: "min-w-[180px]",
    options: [
      { value: "survey-dispatcher",    label: "Disparo de Pesquisas" },
      { value: "adherence-checker",    label: "Verificador de Adesão" },
      { value: "alert-detector",       label: "Detector de Alertas" },
      { value: "employee-unpause",     label: "Reativação de Colaboradores" },
      { value: "pgr-review-reminder",  label: "Lembrete de Revisão PGR" },
      { value: "stripe-webhook-retry", label: "Reprocessamento de Webhooks" },
      { value: "token-cleanup",        label: "Limpeza de Tokens" },
    ],
  },
  {
    type: "select",
    key: "queueName",
    label: "Fila",
    width: "w-[180px]",
    options: [
      { value: "pulse-jobs", label: "Jobs Agendados" },
      { value: "pulse-messages", label: "Mensagens" },
    ],
  },
  {
    type: "select",
    key: "status",
    label: "Status",
    width: "w-[150px]",
    options: [
      { value: "completed", label: "Concluído" },
      { value: "failed", label: "Falhou" },
    ],
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

export function JobLogsFilters({ filters }: Props): React.ReactElement {
  const values: Record<string, string | undefined> = {
    jobName: filters.jobName,
    queueName: filters.queueName,
    status: filters.status,
    dateFrom: filters.dateFrom !== undefined ? filters.dateFrom.toISOString().slice(0, 10) : undefined,
    dateTo: filters.dateTo !== undefined ? filters.dateTo.toISOString().slice(0, 10) : undefined,
  }

  return <FilterBar fields={JOB_LOG_FILTER_FIELDS} values={values} />
}
