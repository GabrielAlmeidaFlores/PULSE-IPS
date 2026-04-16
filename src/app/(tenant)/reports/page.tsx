import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getReports } from "@/modules/anonymous-reports/anonymous-report.service"
import { ReportControls } from "@/app/(tenant)/reports/report-controls"

export default async function ReportsPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const reports = await getReports(session.tenantId)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <h1 className="text-sm font-bold uppercase tracking-widest">Relatos Anonimos</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{reports.length} total</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <ReportControls reports={reports} />
      </div>
    </div>
  )
}
