"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2, Check, X } from "lucide-react"
import { createDepartmentAction, renameDepartmentAction, deleteDepartmentAction } from "@/app/(tenant)/departments/actions"
import { PageHelp } from "@/components/page-help"

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
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleAdd(): void {
    startTransition(async () => {
      const result = await createDepartmentAction(newName)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Departamento criado.")
        setNewName("")
        setShowAddForm(false)
        router.refresh()
      }
    })
  }

  function handleRename(id: string): void {
    startTransition(async () => {
      const result = await renameDepartmentAction(id, editName)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Departamento atualizado.")
        setEditingId(null)
        setEditName("")
        router.refresh()
      }
    })
  }

  function handleDelete(id: string): void {
    startTransition(async () => {
      const result = await deleteDepartmentAction(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Departamento removido.")
        setDeletingId(null)
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
          onClick={() => { setShowAddForm((v) => !v); setNewName("") }}
          style={{ borderRadius: 0 }}
          className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors border border-primary"
        >
          Adicionar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-border bg-card overflow-hidden">

      {showAddForm && (
        <div className="border-b border-border px-4 py-2.5 flex items-center gap-2 bg-muted/20">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do departamento"
            style={{ borderRadius: 0 }}
            className="flex-1 border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
          />
          <button
            onClick={handleAdd}
            disabled={pending || !newName.trim()}
            style={{ borderRadius: 0 }}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 ${  pending || !newName.trim() ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Check size={12} />
            Salvar
          </button>
          <button
            onClick={() => { setShowAddForm(false); setNewName("") }}
            style={{ borderRadius: 0 }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted"
          >
            <X size={12} />
            Cancelar
          </button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funcionarios</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-48">Ações</th>
          </tr>
        </thead>
        <tbody>
          {departments.length === 0 && (
            <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum departamento cadastrado.</td></tr>
          )}
          {departments.map((dept, i) => (
            <tr key={dept.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${  i % 2 !== 0 ? "bg-muted/10" : ""}`}>
              <td className="px-4 py-3 font-medium">
                {editingId === dept.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ borderRadius: 0 }}
                    className="border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(dept.id) }}
                    autoFocus
                  />
                ) : (
                  dept.name
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                {dept.employeeCount}
              </td>
              <td className="px-4 py-3 w-48">
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  {(() => {
                    if (editingId === dept.id) {
                      return (
                        <>
                          <button
                            onClick={() => handleRename(dept.id)}
                            disabled={pending || !editName.trim()}
                            style={{ borderRadius: 0 }}
                            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 ${  pending || !editName.trim() ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <Check size={12} />
                            Salvar
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditName("") }}
                            style={{ borderRadius: 0 }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted"
                          >
                            <X size={12} />
                            Cancelar
                          </button>
                        </>
                      )
                    } else if (deletingId === dept.id) {
                      return (
                        <>
                          <span className="text-[10px] text-muted-foreground mr-1">Confirmar?</span>
                          <button
                            onClick={() => handleDelete(dept.id)}
                            disabled={pending}
                            style={{ borderRadius: 0 }}
                            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-destructive text-destructive hover:bg-destructive/10 ${  pending ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <Check size={12} />
                            Sim
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            style={{ borderRadius: 0 }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted"
                          >
                            <X size={12} />
                            Não
                          </button>
                        </>
                      )
                    } else {
                      return (
                        <>
                          <button
                            onClick={() => { setEditingId(dept.id); setEditName(dept.name) }}
                            style={{ borderRadius: 0 }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted"
                            title="Renomear"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setDeletingId(dept.id)}
                            style={{ borderRadius: 0 }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-destructive/40 text-destructive hover:bg-destructive/10"
                            title="Excluir"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )
                    }
                  })()}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  )
}
