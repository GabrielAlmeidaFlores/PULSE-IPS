"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Check, Plus } from "lucide-react"
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
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  function handleComplete(taskId: string): void {
    startTransition(async () => {
      const result = await completeTaskAction(taskId, planId)
      if (result.error) toast.error(result.error)
    })
  }

  async function handleAdd(): Promise<void> {
    if (!newTaskTitle.trim()) return
    setIsAdding(true)
    const result = await addTaskAction(planId, newTaskTitle)
    setIsAdding(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setNewTaskTitle("")
  }

  return (
    <>
      {tasks.length === 0 && newTaskTitle === "" ? (
        <p className="px-4 py-6 text-xs text-muted-foreground">Nenhuma tarefa ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {tasks.map((task, i) => (
              <tr
                key={task.id}
                className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${  i % 2 !== 0 ? "bg-muted/10" : ""}`}
              >
                <td className="px-4 py-3 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={Boolean(task.completedAt) || isPending}
                    onClick={() => handleComplete(task.id)}
                    className={`px-2 py-1 text-[10px] border flex items-center gap-1 transition-colors ${  task.completedAt ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border hover:bg-primary/5 hover:text-primary hover:border-primary/20"}`}
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
      <div className="border-t border-border px-4 py-3 flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAdd() } }}
          placeholder="Nova tarefa..."
          className="flex-1 bg-input border border-border text-foreground text-[12px] px-3 py-1.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          style={{ borderRadius: 0 }}
        />
        <button
          type="button"
          disabled={isAdding || !newTaskTitle.trim()}
          onClick={() => void handleAdd()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          <Plus size={10} />
          Adicionar
        </button>
      </div>
    </>
  )
}
