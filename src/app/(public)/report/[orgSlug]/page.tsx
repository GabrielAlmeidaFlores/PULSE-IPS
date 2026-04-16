import { ReportForm } from "@/app/(public)/report/[orgSlug]/report-form"

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function ReportPage({ params }: Props): Promise<React.ReactElement> {
  const { orgSlug } = await params

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12">
      <ReportForm orgSlug={orgSlug} />
    </div>
  )
}
