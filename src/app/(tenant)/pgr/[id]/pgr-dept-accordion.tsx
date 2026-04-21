"use client"

import { useState } from "react"
import { ChevronDown, Building2 } from "lucide-react"

interface DeptAccordionItemProps {
  id: string
  name: string
  healthIndex: number
  badge?: React.ReactElement | null
  gauge: React.ReactElement
  children: React.ReactNode
}

function borderColorForIndex(healthIndex: number): string {
  if (healthIndex >= 62) return "border-l-green-500"
  if (healthIndex >= 37) return "border-l-amber-500"
  return "border-l-red-500"
}

export function PgrDeptAccordionItem({ name, healthIndex, badge, gauge, children }: DeptAccordionItemProps): React.ReactElement {
  const [open, setOpen] = useState(false)

  const borderColor = borderColorForIndex(healthIndex)

  return (
    <div className={`border border-border bg-card overflow-hidden border-l-2 ${borderColor}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <h2 className="text-sm font-bold truncate flex-1 min-w-0">{name}</h2>
        {badge}
        {gauge}
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <div>{children}</div>}
    </div>
  )
}
