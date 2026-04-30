"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Pencil, UserX, ChevronRight, SendHorizontal } from "lucide-react"
import { DataTable } from "@/libs/design-system"
import { TablePagination } from "@/libs/design-system/components/data-display/TablePagination"
import { BADGE_BASE, BADGE_DEFAULT, BADGE_GREEN, BADGE_BLUE, BADGE_RED, BADGE_AMBER } from "@/libs/design-system/alert-labels"
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal"
import { EditEmployeeModal, type EmployeeEditData, type EmployeeFormValues } from "@/app/(tenant)/employees/edit-employee-modal"
import { updateEmployeeAction, deactivateEmployeeAction } from "@/app/(tenant)/employees/[id]/actions"
import { resendConsentInviteAction } from "@/app/(tenant)/employees/actions"

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

interface Props {
  employees: EmployeeRow[]
  total: number
  departments: Department[]
}

function consentBadge(event: string | null): React.ReactElement {
  if (event === "accepted") {
    return <span className={`${BADGE_BASE} ${BADGE_GREEN}`}>Aceito</span>
  }
  if (event === "invited") {
    return <span className={`${BADGE_BASE} ${BADGE_BLUE}`}>Enviado</span>
  }
  if (event === "refused") {
    return <span className={`${BADGE_BASE} ${BADGE_RED}`}>Recusado</span>
  }
  if (event === "opted_out" || event === "revoked") {
    return <span className={`${BADGE_BASE} ${BADGE_AMBER}`}>Opt-out</span>
  }
  return <span className={`${BADGE_BASE} ${BADGE_DEFAULT}`}>Não enviado</span>
}

export function EmployeeTable({ employees, total, departments }: Props): React.ReactElement {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editTarget, setEditTarget] = useState<EmployeeEditData | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<EmployeeRow | null>(null)
  const [sendingConsentFor, setSendingConsentFor] = useState<string | null>(null)

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

  function handleResendConsent(emp: EmployeeRow): void {
    setSendingConsentFor(emp.id)
    startTransition(async () => {
      const result = await resendConsentInviteAction(emp.id)
      setSendingConsentFor(null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      const label = emp.consentEvent === null ? "Convite de consentimento enviado." : "Convite de consentimento reenviado."
      toast.success(label)
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
          { label: "Ações", align: "right", className: "w-28" },
          { label: "", className: "w-8" },
        ]}
        total={total}
        emptyMessage="Nenhum funcionário cadastrado."
        pagination={<TablePagination total={total} />}
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
            <td className="px-4 py-3 w-28">
              <div className="flex items-center justify-end gap-1">
                {emp.consentEvent !== "accepted" && (
                  <button
                    onClick={() => handleResendConsent(emp)}
                    disabled={sendingConsentFor === emp.id || pending}
                    style={{ borderRadius: 0 }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-primary/40 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                    title={emp.consentEvent === null ? "Enviar TCLE" : "Reenviar TCLE"}
                  >
                    <SendHorizontal size={12} />
                  </button>
                )}
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
      </DataTable>

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
