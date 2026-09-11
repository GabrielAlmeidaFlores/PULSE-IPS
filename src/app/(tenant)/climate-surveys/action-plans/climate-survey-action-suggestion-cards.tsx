"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { BADGE_BASE, BADGE_BLUE } from "@/libs/design-system/alert-labels"
import {
  acceptClimateSurveyActionSuggestionAction,
  rejectClimateSurveyActionSuggestionAction,
} from "@/app/(tenant)/climate-surveys/action-plans/suggestion-actions"
import type { ClimateSurveyActionSuggestion } from "@/modules/climate-surveys/climate-survey-action-suggestion.service"

interface Props {
  suggestions: ClimateSurveyActionSuggestion[]
}

const inputCls =
  "w-full bg-input border border-input-border text-foreground text-sm px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"

const buttonPrimaryCls =
  "px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"

const buttonGhostCls =
  "px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"

const buttonDangerCls =
  "px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-status-danger-border text-status-danger hover:bg-status-danger-subtle disabled:opacity-50 transition-colors"

interface EditDraft {
  what: string
  why: string
  who: string
  where: string
  when: string
  how: string
  cost: string
}

function toDraft(suggestion: ClimateSurveyActionSuggestion): EditDraft {
  return {
    what: suggestion.what,
    why: suggestion.why,
    who: suggestion.who,
    where: suggestion.where,
    when: suggestion.when,
    how: suggestion.how,
    cost: suggestion.cost ?? "",
  }
}

export function ClimateSurveyActionSuggestionCards({ suggestions }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<ClimateSurveyActionSuggestion | null>(null)
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [rejecting, setRejecting] = useState<ClimateSurveyActionSuggestion | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  if (suggestions.length === 0) return <></>

  function handleAccept(suggestion: ClimateSurveyActionSuggestion, fields: EditDraft): void {
    setPendingId(suggestion.id)
    startTransition(async () => {
      const result = await acceptClimateSurveyActionSuggestionAction({
        suggestionId: suggestion.id,
        what: fields.what,
        why: fields.why,
        who: fields.who,
        where: fields.where,
        when: fields.when,
        how: fields.how,
        ...(fields.cost.trim() !== "" ? { cost: fields.cost.trim() } : {}),
      })
      setPendingId(null)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      toast.success("Sugestão aceita. A ação entrou na trilha de evidência.")
      setEditing(null)
      setDraft(null)
      router.refresh()
    })
  }

  function handleReject(): void {
    const suggestion = rejecting
    if (suggestion === null) return
    setPendingId(suggestion.id)
    startTransition(async () => {
      const result = await rejectClimateSurveyActionSuggestionAction({
        suggestionId: suggestion.id,
        reason: rejectReason,
      })
      setPendingId(null)
      if (result.error !== undefined) {
        toast.error(result.error)
        return
      }
      toast.success("Sugestão recusada.")
      setRejecting(null)
      setRejectReason("")
      router.refresh()
    })
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-status-info" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Sugestões do sistema ({suggestions.length})
          </h2>
        </div>
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="border border-status-info-border bg-status-info-subtle/40 p-4" style={{ borderRadius: 0 }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <span className={`${BADGE_BASE} ${BADGE_BLUE}`}>Sugerido pelo sistema</span>
                <p className="text-sm font-bold text-foreground mt-2">{suggestion.what}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{suggestion.dimensionLabel}</p>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs">
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Por quê</dt>
                <dd className="text-foreground mt-0.5">{suggestion.why}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quem</dt>
                <dd className="text-foreground mt-0.5">{suggestion.who}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Onde</dt>
                <dd className="text-foreground mt-0.5">{suggestion.where}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quando</dt>
                <dd className="text-foreground mt-0.5">{suggestion.when}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quanto</dt>
                <dd className="text-foreground mt-0.5">{suggestion.cost ?? "a definir"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Como</dt>
                <dd className="text-foreground mt-0.5">{suggestion.how}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => handleAccept(suggestion, toDraft(suggestion))}
                disabled={pendingId === suggestion.id}
                className={buttonPrimaryCls}
                style={{ borderRadius: 0 }}
              >
                Aceitar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(suggestion)
                  setDraft(toDraft(suggestion))
                }}
                disabled={pendingId === suggestion.id}
                className={buttonGhostCls}
                style={{ borderRadius: 0 }}
              >
                Editar e aceitar
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejecting(suggestion)
                  setRejectReason("")
                }}
                disabled={pendingId === suggestion.id}
                className={buttonDangerCls}
                style={{ borderRadius: 0 }}
              >
                Recusar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={editing !== null && draft !== null} onOpenChange={(next) => { if (!next) { setEditing(null); setDraft(null) } }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Editar sugestão (5W2H)</DialogTitle>
            {draft !== null && (
              <div className="space-y-3 mt-2">
                {(
                  [
                    { key: "what", label: "O quê", multiline: false },
                    { key: "why", label: "Por quê", multiline: true },
                    { key: "who", label: "Quem", multiline: false },
                    { key: "where", label: "Onde", multiline: false },
                    { key: "when", label: "Quando", multiline: false },
                    { key: "how", label: "Como", multiline: true },
                    { key: "cost", label: "Quanto custa", multiline: false },
                  ] as const
                ).map((field) => (
                  <div key={field.key}>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        rows={2}
                        value={draft[field.key]}
                        onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                        className={inputCls}
                        style={{ borderRadius: 0 }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={draft[field.key]}
                        onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                        className={inputCls}
                        style={{ borderRadius: 0 }}
                      />
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <DialogClose render={<button type="button" className={buttonGhostCls} style={{ borderRadius: 0 }} />}>
                    Cancelar
                  </DialogClose>
                  <button
                    type="button"
                    onClick={() => { if (editing !== null && draft !== null) handleAccept(editing, draft) }}
                    disabled={isPending}
                    className={buttonPrimaryCls}
                    style={{ borderRadius: 0 }}
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Aceitar"}
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={rejecting !== null} onOpenChange={(next) => { if (!next) setRejecting(null) }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-md" style={{ borderRadius: 0 }}>
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Recusar sugestão</DialogTitle>
            <div className="space-y-3 mt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Motivo
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex.: já tratado por outro plano"
                  className={inputCls}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <DialogClose render={<button type="button" className={buttonGhostCls} style={{ borderRadius: 0 }} />}>
                  Cancelar
                </DialogClose>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isPending}
                  className={buttonDangerCls}
                  style={{ borderRadius: 0 }}
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Recusar"}
                </button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  )
}
