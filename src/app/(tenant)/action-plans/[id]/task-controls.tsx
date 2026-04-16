"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Check, Plus } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { completeTaskAction, addTaskAction } from "@/app/(tenant)/action-plans/[id]/actions"

interface Task {
  id: string
  title: string
  completedAt: Date | null
}

interface Props {
  planId: string
  tasks: Task[]
}

export function TaskControls({ planId, tasks }: Props): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")

  function handleComplete(taskId: string): void {
    startTransition(async () => {
      const result = await completeTaskAction(taskId, planId)
      if (result.error) toast.error(result.error)
    })
  }

  function handleAdd(): void {
    if (!newTaskTitle.trim()) return
    startTransition(async () => {
      const result = await addTaskAction(planId, newTaskTitle)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setNewTaskTitle("")
      setShowAddModal(false)
    })
  }

  return (
    <>
      {tasks.length === 0 ? (
        <p className="px-4 py-6 text-xs text-muted-foreground">Nenhuma tarefa ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {tasks.map((task, i) => (
              <tr
                key={task.id}
                className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
              >
                <td className="px-4 py-3 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={Boolean(task.completedAt) || isPending}
                    onClick={() => handleComplete(task.id)}
                    className={`px-2 py-1 text-[10px] border flex items-center gap-1 transition-colors ${
                      task.completedAt
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    <Check size={10} />
                    {task.completedAt ? "concluído" : "pendente"}
                  </button>
                  <span className={task.completedAt ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="border-t border-border px-4 py-3 flex justify-end">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          style={{ borderRadius: 0 }}
        >
          <Plus size={10} />
          Nova tarefa
        </button>
      </div>

      <Dialog open={showAddModal} onOpenChange={(o) => { if (!o) { setShowAddModal(false); setNewTaskTitle("") } }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Nova tarefa</DialogTitle>
            <div className="mt-4 mb-6">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                placeholder="Descreva a tarefa..."
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ borderRadius: 0 }}
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
                disabled={isPending || !newTaskTitle.trim()}
                style={{ borderRadius: 0 }}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Salvando..." : "Adicionar"}
              </button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  )
}
