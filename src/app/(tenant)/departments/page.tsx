import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getDepartmentsForListingPage } from "@/modules/departments/department.service"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { DepartmentControls } from "@/app/(tenant)/departments/department-controls"

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])

  const deptQuery: { page: number; pageSize: number; q?: string } = { page, pageSize }
  if (params["q"] !== undefined) deptQuery.q = params["q"]

  const { items: departments, total } = await getDepartmentsForListingPage(session.tenantId, deptQuery)

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
      <DepartmentControls departments={mappedDepartments} total={total} />
    </div>
  )
}
