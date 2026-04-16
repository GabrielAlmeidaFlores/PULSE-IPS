"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"
import { createDepartmentAction, renameDepartmentAction, deleteDepartmentAction } from "@/app/(tenant)/departments/actions"
import { PageHelp } from "@/components/page-help"
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal"
import { EditNameModal } from "@/components/edit-name-modal"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"

interface DepartmentRow {
  id: string
  name: string
  employeeCount: number
}

interface Props {
  departments: DepartmentRow[]
}

export function DepartmentControls({ departments }: Props): React.ReactElement {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [editTarget, setEditTarget] = useState<DepartmentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null)

  function handleAdd(): void {
    if (!newName.trim()) return
    startTransition(async () => {
      const result = await createDepartmentAction(newName)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Departamento criado.")
        setNewName("")
        setShowAddModal(false)
        router.refresh()
      }
    })
  }

  function handleRename(name: string): void {
    if (!editTarget) return
    startTransition(async () => {
      const result = await renameDepartmentAction(editTarget.id, name)
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
            <PageHelp text="Departamentos agrupam os funcionários da empresa. Cada departamento pode ter sua própria configuração de pesquisa com horários e frequência distintos. Ao cadastrar um funcionário, ele é vinculado a um departamento e herda as configurações de envio desse grupo." />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{departments.length} departamentos</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setNewName("") }}
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
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funcionarios</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum departamento cadastrado.</td></tr>
              )}
              {departments.map((dept, i) => (
                <tr key={dept.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{dept.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{dept.employeeCount}</td>
                  <td className="px-4 py-3 w-24">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditTarget(dept)}
                        style={{ borderRadius: 0 }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted"
                        title="Renomear"
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

      {/* Modal: Adicionar departamento */}
      <Dialog open={showAddModal} onOpenChange={(o) => { if (!o) { setShowAddModal(false); setNewName("") } }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Adicionar departamento</DialogTitle>
            <div className="mt-4 mb-6">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                placeholder="Nome do departamento"
                style={{ borderRadius: 0 }}
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </DialogClose>
              <button
                onClick={handleAdd}
                disabled={pending || !newName.trim()}
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {pending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <EditNameModal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSave={handleRename}
        loading={pending}
        initialName={editTarget?.name ?? ""}
      />

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
