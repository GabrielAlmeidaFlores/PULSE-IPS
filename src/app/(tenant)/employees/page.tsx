import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/modules/auth/session"
import { getEmployees } from "@/modules/employees/employee.service"

export default async function EmployeesPage(): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const { employees, total } = await getEmployees(session.tenantId)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest">Funcionarios</h1>
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
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Departamento</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Telefone</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum funcionario cadastrado.</td></tr>
              )}
              {employees.map((emp, i) => (
                <tr key={emp.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${  i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/employees/${emp.id}`} className="hover:text-primary hover:underline transition-colors">
                      {emp.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.department.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{emp.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${  emp.status === "active" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}>
                      {emp.status === "active" ? "ativo" : "inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2">
            <span className="text-[10px] text-muted-foreground">{total} registros</span>
          </div>
        </div>
      </div>
    </div>
  )
}
