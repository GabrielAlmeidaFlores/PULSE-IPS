import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getDepartments } from "@/modules/departments/department.service"
import { PageHeader } from "@/libs/design-system/components/layout/PageHeader"
import { CreateEmployeeForm } from "@/app/(tenant)/employees/new/create-employee-form"

export default async function NewEmployeePage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const departments = await getDepartments(session.tenantId)

  return (
    <div className="space-y-6">
      <PageHeader title="Adicionar Colaborador" />
      <CreateEmployeeForm departments={departments} />
    </div>
  )
}
