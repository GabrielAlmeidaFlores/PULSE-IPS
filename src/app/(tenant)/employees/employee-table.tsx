"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Pencil, UserX, ChevronRight } from "lucide-react"
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal"
import { EditEmployeeModal, type EmployeeEditData, type EmployeeFormValues } from "@/app/(tenant)/employees/edit-employee-modal"
import { updateEmployeeAction, deactivateEmployeeAction } from "@/app/(tenant)/employees/[id]/actions"

interface Department {
  id: string
  name: string
}

interface EmployeeRow {
  id: string
  name: string
  phone: string
  email: string | null
  status: string
  departmentId: string
  workStartTime: string | null
  workEndTime: string | null
  workDays: number[]
  department: { name: string }
}

interface Props {
  employees: EmployeeRow[]
  total: number
  departments: Department[]
}

export function EmployeeTable({ employees, total, departments }: Props): React.ReactElement {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editTarget, setEditTarget] = useState<EmployeeEditData | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<EmployeeRow | null>(null)

  function handleEdit(emp: EmployeeRow): void {
    setEditTarget({
      id: emp.id,
      name: emp.name,
      phone: emp.phone,
      email: emp.email,
      departmentId: emp.departmentId,
      status: emp.status,
      workStartTime: emp.workStartTime,
      workEndTime: emp.workEndTime,
      workDays: emp.workDays,
    })
  }

  function handleSaveEdit(values: EmployeeFormValues): void {
    if (!editTarget) return
    startTransition(async () => {
      const result = await updateEmployeeAction(editTarget.id, {
        ...values,
        email: values.email === "" ? null : values.email,
        workStartTime: values.workStartTime ?? null,
        workEndTime: values.workEndTime ?? null,
        workDays: values.workDays ?? null,
        status: values.status,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Colaborador atualizado.")
      setEditTarget(null)
      router.refresh()
    })
  }

  function handleDeactivate(): void {
    if (!deactivateTarget) return
    startTransition(async () => {
      const result = await deactivateEmployeeAction(deactivateTarget.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Colaborador desativado.")
      setDeactivateTarget(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Departamento</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Telefone</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24">Ações</th>
              <th className="px-4 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Nenhum funcionário cadastrado.
                </td>
              </tr>
            )}
            {employees.map((emp, i) => (
              <tr
                key={emp.id}
                className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors group ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
              >
                <td className="px-4 py-3 font-medium text-xs">{emp.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{emp.department.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{emp.phone}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      emp.status === "active"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {emp.status === "active" ? "ativo" : "inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 w-24">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleEdit(emp)}
                      style={{ borderRadius: 0 }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
                      title="Editar"
                    >
                      <Pencil size={12} />
                    </button>
                    {emp.status === "active" && (
                      <button
                        onClick={() => setDeactivateTarget(emp)}
                        style={{ borderRadius: 0 }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                        title="Desativar"
                      >
                        <UserX size={12} />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link href={`/employees/${emp.id}`} className="block">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-auto" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border px-4 py-2">
          <span className="text-[10px] text-muted-foreground">{total} registros</span>
        </div>
      </div>

      <EditEmployeeModal
        key={editTarget?.id ?? "closed"}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        loading={pending}
        employee={editTarget}
        departments={departments}
      />

      <ConfirmDeleteModal
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={pending}
        title="Desativar colaborador"
        description={`Tem certeza que deseja desativar "${deactivateTarget?.name}"? Ele deixará de receber pesquisas.`}
      />
    </>
  )
}
