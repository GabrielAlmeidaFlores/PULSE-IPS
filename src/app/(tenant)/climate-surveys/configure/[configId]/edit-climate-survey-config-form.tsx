"use client"

import { useCallback } from "react"
import { ClimateSurveyConfigForm, type ClimateSurveyConfigFormData } from "@/app/(tenant)/climate-surveys/configure/climate-survey-config-form"
import { updateClimateSurveyConfigAction } from "@/app/(tenant)/climate-surveys/configure/[configId]/actions"
import type { ClimateSurveyConfigWithDetails } from "@/modules/climate-surveys/climate-survey-config.service"

interface DepartmentOption {
  id: string
  name: string
}

interface EditClimateSurveyConfigFormProps {
  configId: string
  initialConfig: ClimateSurveyConfigWithDetails
  initialDeptIds: string[]
  departments: DepartmentOption[]
}

export function EditClimateSurveyConfigForm({ configId, initialConfig, initialDeptIds, departments }: EditClimateSurveyConfigFormProps): React.ReactElement {
  const handleSubmit = useCallback(
    (data: ClimateSurveyConfigFormData) => updateClimateSurveyConfigAction(configId, data),
    [configId],
  )

  return (
    <ClimateSurveyConfigForm
      mode="edit"
      initialConfig={initialConfig}
      initialDeptIds={initialDeptIds}
      departments={departments}
      onSubmit={handleSubmit}
      cancelHref="/climate-surveys/configure"
    />
  )
}
