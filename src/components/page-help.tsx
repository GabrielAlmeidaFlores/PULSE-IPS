"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { HelpCircle } from "lucide-react"

interface Props {
  text?: string
  content?: React.ReactNode
}

export function PageHelp({ text, content }: Props): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const anchorRect = useRef<DOMRect | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleClose(): void {
    leaveTimer.current = setTimeout(() => setOpen(false), 80)
  }

  function cancelClose(): void {
    if (leaveTimer.current !== null) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }

  function handleWrapperEnter(): void {
    cancelClose()
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      anchorRect.current = rect
      const left = Math.min(rect.left, window.innerWidth - 320 - 8)
      setPos({ top: rect.bottom + 4, left })
    }
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (open && tooltipRef.current && anchorRect.current) {
      const tipRect = tooltipRef.current.getBoundingClientRect()
      const anchor = anchorRect.current
      if (tipRect.bottom > window.innerHeight - 8) {
        setPos((prev) => ({ ...prev, top: anchor.top - tipRect.height - 4 }))
      }
    }
  }, [open])

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative inline-flex items-center"
        onMouseEnter={handleWrapperEnter}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          onFocus={handleWrapperEnter}
          onBlur={scheduleClose}
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none"
          aria-label="Ajuda"
        >
          <HelpCircle size={13} />
        </button>
      </div>

      {open && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-80 border border-border bg-card shadow-lg p-3 max-h-72 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, borderRadius: 0 }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {content ?? <p className="text-[12px] text-foreground leading-relaxed">{text}</p>}
        </div>
      )}
    </>
  )
}
