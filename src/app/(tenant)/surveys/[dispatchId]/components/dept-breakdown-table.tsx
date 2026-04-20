"use client"

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs"
import { adherenceClass, adherenceBarClass } from "@/app/(tenant)/surveys/[dispatchId]/components/adherence-utils"

interface DeptBreakdownItem {
  id: string
  name: string
  recipients: number
  responses: number
  adherence: number
}

interface Props {
  items: DeptBreakdownItem[]
}

export function DeptBreakdownTable({ items }: Props): React.ReactElement {
  const [selectedIds, setSelectedIds] = useQueryState(
    "depts",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions({ shallow: false }),
  )

  function toggle(id: string): void {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id]
    void setSelectedIds(next.length > 0 ? next : null)
  }

  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Adesão por departamento
        </p>
      </div>
      <div className="divide-y divide-border">
        {items.map((dept) => {
          const isSelected = selectedIds.length === 0 || selectedIds.includes(dept.id)
          const barColor = adherenceBarClass(dept.adherence)
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => toggle(dept.id)}
              className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-muted/40 cursor-pointer ${
                isSelected ? "bg-primary/5" : "opacity-50"
              }`}
            >
              <div className="w-36 shrink-0 flex items-center gap-2">
                <span
                  className={`flex-shrink-0 w-3.5 h-3.5 border flex items-center justify-center ${
                    selectedIds.length > 0 && selectedIds.includes(dept.id)
                      ? "border-primary bg-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {selectedIds.length > 0 && selectedIds.includes(dept.id) && (
                    <svg className="w-2 h-2 text-primary-foreground" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <p className="text-xs font-bold truncate text-foreground">{dept.name}</p>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="w-full h-1.5 bg-muted overflow-hidden">
                  <div className={`h-full ${barColor}`} style={{ width: `${dept.adherence}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[11px]">
                <span className="text-muted-foreground">
                  {dept.responses}/{dept.recipients}
                </span>
                <span className={`font-black w-10 text-right ${adherenceClass(dept.adherence)}`}>
                  {dept.adherence}%
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
