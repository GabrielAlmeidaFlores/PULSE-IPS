import { notFound, redirect } from "next/navigation"
import { resolveHealthSurveyShortCode } from "@/modules/health-surveys/health-survey-response.service"
import { enforceRateLimit, getClientIp } from "@/libs/rate-limit"

interface Props {
  params: Promise<{ token: string; shortCode: string }>
}

export default async function HealthSurveyShortCodePage({ params }: Props): Promise<never> {
  const { token: orgSlug, shortCode } = await params

  const ip = await getClientIp()
  const rateLimitError = await enforceRateLimit(`rl:shortcode-resolve:${ip}`, 30, 60)
  if (rateLimitError) notFound()

  const resolvedToken = await resolveHealthSurveyShortCode(orgSlug, shortCode)

  if (!resolvedToken) {
    notFound()
  }

  redirect(`/health-survey/${resolvedToken}`)
}
