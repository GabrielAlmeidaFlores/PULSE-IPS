import { ClimateSurveyUnlockForm } from "@/app/(public)/climate-survey/link/[linkToken]/climate-survey-unlock-form"

interface ClimateSurveySignedLinkPageProps {
  params: Promise<{ linkToken: string }>
}

export default async function ClimateSurveySignedLinkPage({ params }: ClimateSurveySignedLinkPageProps): Promise<React.ReactElement> {
  const { linkToken } = await params
  return <ClimateSurveyUnlockForm linkToken={linkToken} />
}
