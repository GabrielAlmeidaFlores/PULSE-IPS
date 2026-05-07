"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/libs/design-system"
import { TablePagination } from "@/libs/design-system/components/data-display/TablePagination"
import { BADGE_BASE, BADGE_DEFAULT, BADGE_GREEN, BADGE_RED, BADGE_AMBER } from "@/libs/design-system/alert-labels"
import { EditEmployeeModal, type EmployeeEditData, type EmployeeFormValues } from "@/app/(tenant)/employees/edit-employee-modal"
import { updateEmployeeAction, deleteEmployeeAction } from "@/app/(tenant)/employees/[id]/actions"
import { ConfirmActionModal } from "@/components/confirm-action-modal"

interface Department {
  id: string
  name: string
}

interface EmployeeRow {
  id: string
  name: string
  phone: string
  document: string | null
  email: string | null
  status: string
  departmentId: string
  workStartTime: string | null
  workEndTime: string | null
  workDays: number[]
  department: { name: string }
  consentEvent: string | null
}

interface EmployeeTableProps {
  employees: EmployeeRow[]
  total: number
  departments: Department[]
  isAdmin: boolean
}

function consentBadge(event: string | null): React.ReactElement {
  if (event === "accepted") {
    return <span className={`${BADGE_BASE} ${BADGE_GREEN}`}>Aceito</span>
  }
  if (event === "refused") {
    return <span className={`${BADGE_BASE} ${BADGE_RED}`}>Recusado</span>
  }
  if (event === "opted_out" || event === "revoked") {
    return <span className={`${BADGE_BASE} ${BADGE_AMBER}`}>Opt-out</span>
  }
  return <span className={`${BADGE_BASE} ${BADGE_DEFAULT}`}>Pendente</span>
}

export function EmployeeTable({ employees, total, departments, isAdmin }: EmployeeTableProps): React.ReactElement {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editTarget, setEditTarget] = useState<EmployeeEditData | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  function handleEdit(emp: EmployeeRow): void {
    setEditTarget({
      id: emp.id,
      name: emp.name,
      phone: emp.phone,
      document: emp.document,
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
        document: values.document === "" ? null : (values.document ?? null),
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

  function handleConfirmDelete(): void {
    if (!deleteTargetId) return
    startTransition(async () => {
      const result = await deleteEmployeeAction(deleteTargetId)
      if (result.error) {
        toast.error(result.error)
        setDeleteTargetId(null)
        return
      }
      toast.success("Colaborador excluído.")
      setDeleteTargetId(null)
      router.refresh()
    })
  }

  return (
    <>
      <DataTable
        columns={[
          { label: "Nome" },
          { label: "Departamento" },
          { label: "Telefone" },
          { label: "Status" },
          { label: "Consentimento" },
          { label: "Ações", align: "right", className: "w-20" },
        ]}
        total={total}
        emptyMessage="Nenhum funcionário cadastrado."
        pagination={<TablePagination total={total} />}
        minWidth={720}
      >
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
            <td className="px-4 py-3">
              {consentBadge(emp.consentEvent)}
            </td>
            <td className="px-4 py-3 w-20">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => handleEdit(emp)}
                  style={{ borderRadius: 0 }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
                  title="Editar"
                >
                  <Pencil size={12} />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setDeleteTargetId(emp.id)}
                    style={{ borderRadius: 0 }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-status-danger-border text-status-danger hover:bg-status-danger-subtle transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      <ConfirmActionModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        loading={pending}
        title="Excluir colaborador"
        description="Esta ação é irreversível. O colaborador e todos os seus dados serão permanentemente excluídos. Colaboradores com histórico de consentimento não podem ser excluídos."
        confirmLabel="Excluir"
        variant="destructive"
      />

      <EditEmployeeModal
        key={editTarget?.id ?? "closed"}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        loading={pending}
        employee={editTarget}
        departments={departments}
      />
    </>
  )
}

