import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { PageHeader } from "@/libs/design-system/components/layout/PageHeader"
import { ImportEmployeesForm } from "@/app/(tenant)/employees/import/import-form"

export default async function ImportPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <PageHeader title="Importar Colaboradores" />
      <ImportEmployeesForm />
    </div>
  )
}
