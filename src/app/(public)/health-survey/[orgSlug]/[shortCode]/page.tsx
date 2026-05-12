import { notFound, redirect } from "next/navigation"
import { resolveHealthSurveyShortCode } from "@/modules/health-surveys/health-survey-response.service"

interface Props {
  params: Promise<{ orgSlug: string; shortCode: string }>
}

export default async function HealthSurveyShortCodePage({ params }: Props): Promise<never> {
  const { orgSlug, shortCode } = await params

  const token = await resolveHealthSurveyShortCode(orgSlug, shortCode)

  if (!token) {
    notFound()
  }

  redirect(`/health-survey/${token}`)
}
