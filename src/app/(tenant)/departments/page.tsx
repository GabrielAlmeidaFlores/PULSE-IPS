import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getDepartments } from "@/modules/departments/department.service"
import { DepartmentControls } from "@/app/(tenant)/departments/department-controls"

export default async function DepartmentsPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const departments = await getDepartments(session.tenantId)

  const mappedDepartments = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    employeeCount: (dept as { _count?: { employees?: number } })._count?.employees ?? 0,
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <h1 className="text-sm font-bold uppercase tracking-widest">Departamentos</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{departments.length} departamentos</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <DepartmentControls departments={mappedDepartments} />
      </div>
    </div>
  )
}
