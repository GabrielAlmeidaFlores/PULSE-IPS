import { HealthSurveyUnlockForm } from "@/app/(public)/health-survey/link/[linkToken]/health-survey-unlock-form"

interface HealthSurveySignedLinkPageProps {
  params: Promise<{ linkToken: string }>
}

export default async function HealthSurveySignedLinkPage({ params }: HealthSurveySignedLinkPageProps): Promise<React.ReactElement> {
  const { linkToken } = await params
  return <HealthSurveyUnlockForm linkToken={linkToken} />
}
