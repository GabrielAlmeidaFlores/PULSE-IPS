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
    workStartTime: dept.workStartTime,
    workEndTime: dept.workEndTime,
    workDays: dept.workDays.map((w) => w.dayOfWeek),
    employeeCount: (dept as { _count?: { employees?: number } })._count?.employees ?? 0,
  }))

  return (
    <div className="flex flex-col h-full">
      <DepartmentControls departments={mappedDepartments} />
    </div>
  )
}
