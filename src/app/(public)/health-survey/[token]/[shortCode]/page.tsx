import { notFound, redirect } from "next/navigation"
import { resolveHealthSurveyShortCode } from "@/modules/health-surveys/health-survey-response.service"

interface Props {
  params: Promise<{ token: string; shortCode: string }>
}

export default async function HealthSurveyShortCodePage({ params }: Props): Promise<never> {
  const { token: orgSlug, shortCode } = await params

  const resolvedToken = await resolveHealthSurveyShortCode(orgSlug, shortCode)

  if (!resolvedToken) {
    notFound()
  }

  redirect(`/health-survey/${resolvedToken}`)
}
