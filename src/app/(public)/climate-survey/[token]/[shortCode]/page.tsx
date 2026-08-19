import { notFound, redirect } from "next/navigation"
import { resolveClimateSurveyShortCode } from "@/modules/climate-surveys/climate-survey-response.service"
import { enforceRateLimit, getClientIp } from "@/libs/rate-limit"

interface Props {
  params: Promise<{ token: string; shortCode: string }>
}

export default async function ClimateSurveyShortCodePage({ params }: Props): Promise<never> {
  const { token: orgSlug, shortCode } = await params

  const ip = await getClientIp()
  const rateLimitError = await enforceRateLimit(`rl:shortcode-resolve:${ip}`, 30, 60)
  if (rateLimitError) notFound()

  const resolvedToken = await resolveClimateSurveyShortCode(orgSlug, shortCode)

  if (!resolvedToken) {
    notFound()
  }

  redirect(`/climate-survey/${resolvedToken}`)
}
