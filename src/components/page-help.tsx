"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"

interface Props {
  text: string
}

export function PageHelp({ text }: Props): React.ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none"
        aria-label="Ajuda"
      >
        <HelpCircle size={13} />
      </button>

      {open && (
        <div className="absolute left-5 top-0 z-50 w-72 border border-border bg-card shadow-lg p-3" style={{ borderRadius: 0 }}>
          <p className="text-[12px] text-foreground leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  )
}
