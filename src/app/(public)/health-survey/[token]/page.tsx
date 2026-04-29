import { validateHealthSurveyToken } from "@/modules/health-surveys/health-survey-response.service"
import { HealthSurveyPageClient } from "@/app/(public)/health-survey/[token]/health-survey-page-client"

interface Props {
  params: Promise<{ token: string }>
}

export default async function SurveyPage({ params }: Props): Promise<React.ReactElement> {
  const { token } = await params
  const validation = await validateHealthSurveyToken(token)

  if (!validation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="border border-border bg-card max-w-sm w-full mx-4 border-l-4 border-l-destructive" style={{ borderRadius: 0 }}>
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">Pesquisa indisponível</p>
            <p className="text-[12px] text-muted-foreground">{validation.error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12">
      <HealthSurveyPageClient
        token={token}
        employeeName={validation.employeeName}
        consentStatus={validation.consentStatus}
        consentTermContent={validation.consentTermContent}
        questions={validation.questions}
      />
    </div>
  )
}
