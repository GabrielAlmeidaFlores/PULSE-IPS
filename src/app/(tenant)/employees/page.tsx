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
            <h1 className="text-sm font-bold uppercase tracking-widest">Funcionários</h1>
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">O que são colaboradores?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Todo funcionário cadastrado aqui recebe pesquisas de bem-estar automaticamente pelo sistema, desde que tenha aceitado o <strong>TCLE</strong> (Termo de Consentimento Livre e Esclarecido). Somente colaboradores com consentimento ativo participam das pesquisas.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status do colaborador</p>
                  <ul className="text-[12px] text-foreground leading-relaxed space-y-1 list-none">
                    <li>🟢 <strong>Ativo</strong> — recebe pesquisas normalmente</li>
                    <li>⏸️ <strong>Pausado</strong> — afastamento temporário (férias, licença); retoma automaticamente na data configurada</li>
                    <li>🔴 <strong>Inativo</strong> — desligado; não recebe pesquisas</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Horário de trabalho</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Cada colaborador pode ter horário próprio (início/fim do turno e dias da semana). Se não configurado, herda o horário do departamento. As pesquisas são enviadas <strong>apenas dentro do expediente</strong> configurado — nunca fora do horário de trabalho.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Importação em massa</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Use o botão <strong>Importar</strong> para carregar uma planilha Excel com nome, telefone, e-mail e setor. O sistema detecta os cabeçalhos automaticamente e exibe um preview com os registros válidos e os erros antes de confirmar.</p>
                </div>
              </div>
            } />
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
          employees={employees.map((emp) => ({
            id: emp.id,
            name: emp.name,
            phone: emp.phone,
            email: emp.email,
            status: emp.status,
            departmentId: emp.departmentId,
            workStartTime: emp.workStartTime,
            workEndTime: emp.workEndTime,
            department: emp.department,
            workDays: emp.workDays.map((w) => w.dayOfWeek),
          }))}
          total={total}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </div>
  )
}
