import { redirect } from "next/navigation"
import { getSuperAdminSession } from "@/modules/auth/session"
import { listSuperAdminsPaginated } from "@/modules/auth/auth.service"
import { buildPaginationParams } from "@/libs/utils/pagination"
import { TablePagination } from "@/libs/design-system"

export default async function SuperAdminsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}): Promise<React.ReactElement> {
  const session = await getSuperAdminSession()
  if (!session) redirect("/super-admin/login")

  const params = await searchParams
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])

  const { items: admins, total } = await listSuperAdminsPaginated({ page, pageSize })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">Super Admins</h1>
          <p className="text-[11px] text-muted-foreground">{total} usuário(s) com acesso à plataforma</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="border border-border bg-card">
          <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ minWidth: 480 }}>
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">E-mail</th>
                <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground text-[11px] tracking-wide">
                    Nenhum super admin cadastrado.
                  </td>
                </tr>
              )}
              {admins.map((admin, i) => (
                <tr
                  key={admin.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
                >
                  <td className="px-4 py-2.5 font-semibold text-foreground">
                    {admin.name}
                    {admin.id === session.adminId && (
                      <span className="ml-2 text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
                        você
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{admin.email}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR").format(admin.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <TablePagination total={total} />
      </div>
    </div>
  )
}
