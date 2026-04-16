import { getConsentByToken, getActiveTermVersion } from "@/modules/consent/consent.service"
import { ConsentForm } from "@/app/(public)/consent/[token]/consent-form"

interface Props {
  params: Promise<{ token: string }>
}

export default async function ConsentPage({ params }: Props): Promise<React.ReactElement> {
  const { token } = await params
  const [consentInvite, activeVersion] = await Promise.all([
    getConsentByToken(token),
    getActiveTermVersion(),
  ])

  if (!consentInvite || !activeVersion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="border border-border bg-card max-w-sm w-full mx-4 border-l-4 border-l-destructive" style={{ borderRadius: 0 }}>
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">Link inválido</p>
            <p className="text-[12px] text-muted-foreground">Este link de consentimento é inválido ou expirou.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12">
      <ConsentForm token={token} content={activeVersion.content} />
    </div>
  )
}
