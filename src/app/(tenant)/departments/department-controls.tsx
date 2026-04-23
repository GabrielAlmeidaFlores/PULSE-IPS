"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"
import { createDepartmentAction, updateDepartmentAction, deleteDepartmentAction } from "@/app/(tenant)/departments/actions"
import { PageHelp } from "@/components/page-help"
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"

interface DepartmentRow {
  id: string
  name: string
  workStartTime: string
  workEndTime: string
  workDays: number[]
  employeeCount: number
}

interface Props {
  departments: DepartmentRow[]
}

interface DeptFormState {
  name: string
  workStartTime: string
  workEndTime: string
  workDays: number[]
}

const ALL_DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
]

const DEFAULT_FORM: DeptFormState = {
  name: "",
  workStartTime: "09:00",
  workEndTime: "18:00",
  workDays: [1, 2, 3, 4, 5],
}

function rowToForm(dept: DepartmentRow): DeptFormState {
  return {
    name: dept.name,
    workStartTime: dept.workStartTime,
    workEndTime: dept.workEndTime,
    workDays: dept.workDays,
  }
}

function formatHours(start: string, end: string): string {
  return `${start} – ${end}`
}

function formatDays(days: number[]): string {
  const labels: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" }
  return days.map((d) => labels[d] ?? String(d)).join(", ")
}

interface WorkScheduleFieldsProps {
  form: DeptFormState
  onChange: (f: DeptFormState) => void
}

function WorkScheduleFields({ form, onChange }: WorkScheduleFieldsProps): React.ReactElement {
  function toggleDay(day: number): void {
    const current = form.workDays
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    onChange({ ...form, workDays: next })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Nome <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Ex: Produção"
          style={{ borderRadius: 0 }}
          className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Dias de trabalho
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_DAYS.map((day) => {
            const active = form.workDays.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                style={{ borderRadius: 0 }}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {day.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Horário de trabalho
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-[10px] text-muted-foreground mb-1">Início</label>
            <input
              type="time"
              value={form.workStartTime}
              onChange={(e) => onChange({ ...form, workStartTime: e.target.value })}
              style={{ borderRadius: 0 }}
              className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <span className="text-muted-foreground mt-4">–</span>
          <div className="flex-1">
            <label className="block text-[10px] text-muted-foreground mb-1">Fim</label>
            <input
              type="time"
              value={form.workEndTime}
              onChange={(e) => onChange({ ...form, workEndTime: e.target.value })}
              style={{ borderRadius: 0 }}
              className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DepartmentControls({ departments }: Props): React.ReactElement {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<DeptFormState>(DEFAULT_FORM)
  const [editTarget, setEditTarget] = useState<DepartmentRow | null>(null)
  const [editForm, setEditForm] = useState<DeptFormState>(DEFAULT_FORM)
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null)

  function openEdit(dept: DepartmentRow): void {
    setEditTarget(dept)
    setEditForm(rowToForm(dept))
  }

  function handleAdd(): void {
    if (!addForm.name.trim()) return
    startTransition(async () => {
      const result = await createDepartmentAction({
        name: addForm.name,
        workStartTime: addForm.workStartTime,
        workEndTime: addForm.workEndTime,
        workDays: addForm.workDays,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Departamento criado.")
        setAddForm(DEFAULT_FORM)
        setShowAddModal(false)
        router.refresh()
      }
    })
  }

  function handleEdit(): void {
    if (!editTarget || !editForm.name.trim()) return
    startTransition(async () => {
      const result = await updateDepartmentAction(editTarget.id, {
        name: editForm.name,
        workStartTime: editForm.workStartTime,
        workEndTime: editForm.workEndTime,
        workDays: editForm.workDays,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Departamento atualizado.")
        setEditTarget(null)
        router.refresh()
      }
    })
  }

  function handleDelete(): void {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteDepartmentAction(deleteTarget.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Departamento removido.")
        setDeleteTarget(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold uppercase tracking-widest">Departamentos</h1>
            <PageHelp content={
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Para que servem os setores?</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Setores agrupam colaboradores e são a unidade de análise do Pulse. Os resultados das pesquisas são apresentados <strong>por setor</strong> — nunca individualmente — garantindo o anonimato e permitindo identificar quais áreas precisam de atenção.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Horário de trabalho padrão</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Cada setor tem um horário padrão (ex: 09:00–18:00, seg–sex). Esse horário define <strong>quando as pesquisas podem ser enviadas</strong> aos colaboradores daquele setor. Colaboradores com horário próprio têm prioridade sobre o do setor.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Cadeia de herança de horário</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Na ordem de prioridade: <strong>colaborador → setor → configuração da pesquisa</strong>. O sistema sempre usa o horário mais específico disponível para garantir que o envio ocorre durante o expediente real de cada pessoa.</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Configuração de pesquisa por setor</p>
                  <p className="text-[12px] text-foreground leading-relaxed">Em <strong>Pesquisas → Configurar</strong> você define a frequência de envio para cada setor (diária, semanal, quinzenal etc.). Um setor sem configuração ativa não recebe pesquisas.</p>
                </div>
              </div>
            } />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{departments.length} departamentos</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setAddForm(DEFAULT_FORM) }}
          style={{ borderRadius: 0 }}
          className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors border border-primary"
        >
          Adicionar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dias</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Horário</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funcionários</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum departamento cadastrado.</td></tr>
              )}
              {departments.map((dept, i) => (
                <tr key={dept.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{dept.name}</td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">{formatDays(dept.workDays)}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">{formatHours(dept.workStartTime, dept.workEndTime)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{dept.employeeCount}</td>
                  <td className="px-4 py-3 w-24">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(dept)}
                        style={{ borderRadius: 0 }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted"
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(dept)}
                        style={{ borderRadius: 0 }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-destructive/40 text-destructive hover:bg-destructive/10"
                        title="Excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={(o) => { if (!o) { setShowAddModal(false); setAddForm(DEFAULT_FORM) } }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Adicionar departamento</DialogTitle>
            <div className="mt-4 mb-6">
              <WorkScheduleFields form={addForm} onChange={setAddForm} />
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose style={{ borderRadius: 0 }} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors">
                Cancelar
              </DialogClose>
              <button
                onClick={handleAdd}
                disabled={pending || !addForm.name.trim()}
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {pending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Editar departamento</DialogTitle>
            <div className="mt-4 mb-6">
              <WorkScheduleFields form={editForm} onChange={setEditForm} />
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose style={{ borderRadius: 0 }} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors">
                Cancelar
              </DialogClose>
              <button
                onClick={handleEdit}
                disabled={pending || !editForm.name.trim()}
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {pending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={pending}
        title="Excluir departamento"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
