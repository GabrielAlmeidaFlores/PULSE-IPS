import { validateClimateSurveyToken } from "@/modules/climate-surveys/climate-survey-response.service"
import { ClimateSurveyPageClient } from "@/app/(public)/climate-survey/[token]/climate-survey-page-client"

interface Props {
  params: Promise<{ token: string }>
}

export default async function ClimateSurveyPage({ params }: Props): Promise<React.ReactElement> {
  const { token } = await params
  const validation = await validateClimateSurveyToken(token)

  if (!validation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="border border-border bg-card max-w-sm w-full border-l-4 border-l-destructive" style={{ borderRadius: 0 }}>
          <div className="px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">Pesquisa indisponível</p>
            <p className="text-[12px] text-muted-foreground">{validation.error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-start sm:justify-center bg-muted/30 py-4 px-3 sm:py-12 sm:px-4">
      <ClimateSurveyPageClient
        token={token}
        employeeName={validation.employeeName}
        consentStatus={validation.consentStatus}
        consentTermContent={validation.consentTermContent}
        questions={validation.questions}
      />
    </div>
  )
}
