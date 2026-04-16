import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getEmployees } from "@/modules/employees/employee.service"
import { getDepartments } from "@/modules/departments/department.service"
import { PageHelp } from "@/components/page-help"
import { EmployeeTable } from "@/app/(tenant)/employees/employee-table"

export default async function EmployeesPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const [{ employees, total }, departments] = await Promise.all([
    getEmployees(session.tenantId),
    getDepartments(session.tenantId),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Funcionarios</h1>
            <PageHelp text="Lista todos os colaboradores da empresa. Cada funcionário está vinculado a um departamento e recebe pesquisas automaticamente. Aqui você cadastra, edita, desativa funcionários e gerencia o horário de trabalho individual. Também é possível importar via planilha CSV." />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{total} total</p>
        </div>
        <div className="flex gap-0">
          <Link href="/employees/import" className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Importar
          </Link>
          <Link href="/employees/new" className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors border border-primary">
            Adicionar
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <EmployeeTable
          employees={employees}
          total={total}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </div>
  )
}
