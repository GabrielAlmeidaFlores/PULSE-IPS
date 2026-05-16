import { ReportForm } from "@/app/(public)/report/[orgSlug]/report-form"
import { getOrganizationBySlug } from "@/modules/organizations/organization.service"

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function ReportPage({ params }: Props): Promise<React.ReactElement> {
  const { orgSlug } = await params

  const org = await getOrganizationBySlug(orgSlug)
  const isAvailable = org?.isActive === true

  if (!isAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12">
        <div className="bg-card border border-border p-8 max-w-md w-full mx-4 text-center">
          <p className="text-sm font-semibold text-foreground">Canal indisponível</p>
          <p className="text-xs text-muted-foreground mt-2">Este canal de relato não está disponível no momento.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12">
      <ReportForm orgSlug={orgSlug} />
    </div>
  )
}
