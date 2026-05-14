"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface DangerZoneSimpleProps {
  actionTitle: string
  actionDescription: string
  actionLabel: string
  onAction: () => void
  loading?: boolean | undefined
  currentStateLabel?: string | undefined
  currentStateVariant?: "active" | "inactive" | undefined
  pendingSaveMessage?: string | undefined
  children?: never
}

interface DangerZoneCustomProps {
  actionTitle?: never
  actionDescription?: never
  actionLabel?: never
  onAction?: never
  loading?: never
  currentStateLabel?: never
  currentStateVariant?: never
  pendingSaveMessage?: never
  children: React.ReactNode
}

type DangerZoneContentProps = DangerZoneSimpleProps | DangerZoneCustomProps

export type DangerZoneProps = {
  sectionTitle: string
  className?: string
} & DangerZoneContentProps

export function DangerZone(props: DangerZoneProps): React.ReactElement {
  const [expanded, setExpanded] = useState(true)
  const [pendingSave, setPendingSave] = useState(false)

  return (
    <div className={`border border-status-danger-border${props.className !== undefined ? ` ${props.className}` : ""}`}>
      <button
        type="button"
        style={{ borderRadius: 0 }}
        className="w-full flex items-center justify-between px-4 py-2 bg-status-danger-subtle hover:bg-status-danger-subtle/80 transition-colors"
        onClick={() => { setExpanded((v) => !v) }}
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-status-danger">
            Zona de Perigo
          </span>
          <span className="text-[10px] text-status-danger/70 font-medium">
            {props.sectionTitle}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 text-status-danger shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-status-danger shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-status-danger-border">
          {"children" in props ? (
            props.children
          ) : (
            <div className="px-4 py-3 space-y-2">
              {props.currentStateLabel !== undefined && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                      props.currentStateVariant === "active" ? "bg-status-success" : "bg-muted-foreground"
                    }`}
                  />
                  <span className="text-[11px] text-muted-foreground">{props.currentStateLabel}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">{props.actionTitle}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{props.actionDescription}</p>
                </div>
                <button
                  type="button"
                  disabled={props.loading}
                  style={{ borderRadius: 0 }}
                  className="shrink-0 text-xs font-semibold text-status-danger border border-status-danger-border px-3 py-1.5 hover:bg-status-danger-subtle disabled:opacity-50 transition-colors"
                  onClick={() => {
                    props.onAction()
                    if (props.pendingSaveMessage !== undefined) setPendingSave(true)
                  }}
                >
                  {props.actionLabel}
                </button>
              </div>
              {pendingSave && props.pendingSaveMessage !== undefined && (
                <p className="text-[11px] text-status-warning font-medium">
                  {props.pendingSaveMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

