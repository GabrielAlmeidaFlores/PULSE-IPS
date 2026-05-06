"use client"

import { useCallback } from "react"
import { HealthSurveyConfigForm, type HealthSurveyConfigFormData } from "@/app/(tenant)/health-surveys/configure/health-survey-config-form"
import { updateHealthSurveyConfigAction } from "@/app/(tenant)/health-surveys/configure/[configId]/actions"
import type { HealthSurveyConfigWithDetails } from "@/modules/health-surveys/health-survey-config.service"

interface EditHealthSurveyConfigFormProps {
  configId: string
  initialConfig: HealthSurveyConfigWithDetails
}

export function EditHealthSurveyConfigForm({ configId, initialConfig }: EditHealthSurveyConfigFormProps): React.ReactElement {
  const handleSubmit = useCallback(
    (data: HealthSurveyConfigFormData) => updateHealthSurveyConfigAction(configId, data),
    [configId],
  )

  return (
    <HealthSurveyConfigForm
      mode="edit"
      initialConfig={initialConfig}
      onSubmit={handleSubmit}
      cancelHref="/health-surveys/configure"
    />
  )
}
