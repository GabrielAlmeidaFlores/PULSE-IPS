import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getEmployee } from "@/modules/employees/employee.service"
import { getDepartments } from "@/modules/departments/department.service"
import { EmployeeDetail } from "@/app/(tenant)/employees/[id]/employee-detail"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const [employee, departments] = await Promise.all([
    getEmployee(session.tenantId, id),
    getDepartments(session.tenantId),
  ])

  if (!employee) notFound()

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <Link href="/employees" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Colaboradores</Link>
        <div className="flex items-start justify-between mt-2">
          <h1 className="text-sm font-bold uppercase tracking-widest">{employee.name}</h1>
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${employee.status === "active" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}>
            {employee.status === "active" ? "ativo" : "inativo"}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <EmployeeDetail employee={employee} departments={departments} />
      </div>
    </div>
  )
}
