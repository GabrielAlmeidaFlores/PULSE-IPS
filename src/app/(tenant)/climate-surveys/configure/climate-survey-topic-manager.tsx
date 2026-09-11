"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Lock, Pencil, Plus, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { ConfirmActionModal } from "@/components/confirm-action-modal"
import {
  createClimateSurveyTopicAction,
  deactivateClimateSurveyTopicAction,
  renameClimateSurveyTopicAction,
} from "@/app/(tenant)/climate-surveys/configure/topics/actions"
import type { ClimateSurveyTopicOption } from "@/modules/climate-surveys/climate-survey.types"

interface ClimateSurveyTopicManagerProps {
  topics: ClimateSurveyTopicOption[]
}

const INPUT_CLASS =
  "flex-1 min-w-0 bg-input border border-input-border text-foreground text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

export function ClimateSurveyTopicManager({ topics }: ClimateSurveyTopicManagerProps): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newLabel, setNewLabel] = useState("")
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState("")
  const [deactivateTarget, setDeactivateTarget] = useState<ClimateSurveyTopicOption | null>(null)

  function handleCreate(): void {
    if (newLabel.trim().length === 0) {
      toast.error("Informe o nome do tópico.")
      return
    }
    startTransition(async () => {
      const result = await createClimateSurveyTopicAction(newLabel)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      setNewLabel("")
      toast.success("Tópico criado.")
      router.refresh()
    })
  }

  function handleRename(topic: ClimateSurveyTopicOption): void {
    if (editingLabel.trim().length === 0) {
      toast.error("Informe o nome do tópico.")
      return
    }
    startTransition(async () => {
      const result = await renameClimateSurveyTopicAction(topic.id, editingLabel)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      setEditingTopicId(null)
      setEditingLabel("")
      toast.success("Tópico renomeado.")
      router.refresh()
    })
  }

  function handleDeactivate(): void {
    if (deactivateTarget === null) return
    startTransition(async () => {
      const result = await deactivateClimateSurveyTopicAction(deactivateTarget.id)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      setDeactivateTarget(null)
      toast.success("Tópico desativado.")
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        style={{ borderRadius: 0 }}
      >
        <Settings2 className="h-3.5 w-3.5" />
        Gerenciar tópicos
      </button>

      <Dialog open={open} onOpenChange={(next) => { if (!next) setOpen(false) }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Tópicos</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Crie tópicos próprios para agrupar as perguntas. Tópicos padrão não podem ser excluídos.
            </p>

            <div className="flex items-start gap-2 min-w-0">
              <input
                value={newLabel}
                onChange={(event) => { setNewLabel(event.target.value) }}
                placeholder="Nome do novo tópico"
                aria-label="Nome do novo tópico"
                className={INPUT_CLASS}
                style={{ borderRadius: 0 }}
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                style={{ borderRadius: 0 }}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </div>

            <div className="mt-4 divide-y divide-border border border-border">
              {topics.filter((topic) => topic.isActive).map((topic) => {
                const isEditing = editingTopicId === topic.key
                return (
                  <div key={topic.key} className="flex items-center gap-2 px-3 py-2.5 min-w-0">
                    {isEditing ? (
                      <>
                        <input
                          value={editingLabel}
                          onChange={(event) => { setEditingLabel(event.target.value) }}
                          aria-label="Nome do tópico"
                          className={INPUT_CLASS}
                          style={{ borderRadius: 0 }}
                        />
                        <button
                          type="button"
                          onClick={() => { handleRename(topic) }}
                          disabled={isPending}
                          className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors shrink-0"
                          style={{ borderRadius: 0 }}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingTopicId(null); setEditingLabel("") }}
                          className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:bg-muted transition-colors shrink-0"
                          style={{ borderRadius: 0 }}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 min-w-0 truncate text-sm text-foreground">{topic.label}</span>
                        {topic.isSystem ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                            <Lock className="h-3 w-3" />
                            Padrão
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              title="Renomear"
                              onClick={() => { setEditingTopicId(topic.key); setEditingLabel(topic.label) }}
                              className="flex items-center gap-1 px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              style={{ borderRadius: 0 }}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              title="Excluir"
                              onClick={() => { setDeactivateTarget(topic) }}
                              className="flex items-center gap-1 px-2 py-1 border border-status-danger-border text-status-danger hover:bg-status-danger-subtle transition-colors"
                              style={{ borderRadius: 0 }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end mt-5">
              <DialogClose
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                style={{ borderRadius: 0 }}
              >
                Fechar
              </DialogClose>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <ConfirmActionModal
        open={deactivateTarget !== null}
        onClose={() => { setDeactivateTarget(null) }}
        onConfirm={handleDeactivate}
        loading={isPending}
        title="Excluir tópico"
        description={`Tem certeza que deseja excluir o tópico "${deactivateTarget?.label ?? ""}"? As perguntas já criadas com ele permanecem, mas o tópico deixa de aparecer para novas seleções.`}
        confirmLabel="Excluir"
        variant="destructive"
      />
    </>
  )
}
