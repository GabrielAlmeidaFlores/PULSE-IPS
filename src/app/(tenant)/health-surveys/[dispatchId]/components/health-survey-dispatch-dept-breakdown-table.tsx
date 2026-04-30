"use client"

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs"
import { healthIndexAccent, adherenceRateTextColor } from "@/libs/utils/health-index"

interface DeptBreakdownItem {
  id: string
  name: string
  recipients: number
  responses: number
  adherence: number
  healthIndex: number | null
}

interface HealthSurveyDispatchDeptBreakdownTableProps {
  items: DeptBreakdownItem[]
}

export function HealthSurveyDispatchDeptBreakdownTable({ items }: HealthSurveyDispatchDeptBreakdownTableProps): React.ReactElement {
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

  const hasHealthData = items.some((d) => d.healthIndex !== null)

  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Ranking de Departamentos
        </p>
        <p className="text-[10px] text-muted-foreground">{items.length} setores · clique para filtrar</p>
      </div>
      <div className="px-5 py-2 border-b border-border bg-muted/20 flex items-center gap-4">
        <span className="w-6 shrink-0" />
        <span className="w-5 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1 min-w-0 whitespace-nowrap">
          Departamento
        </span>
        {hasHealthData && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24 text-center shrink-0 whitespace-nowrap">
            Índice de Saúde
          </span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-16 text-center shrink-0 whitespace-nowrap">
          Adesão
        </span>
      </div>
      <div className="divide-y divide-border">
        {items.map((dept, idx) => {
          const isSelected = selectedIds.length === 0 || selectedIds.includes(dept.id)
          const hi = dept.healthIndex
          const hiTextColor = healthIndexAccent(hi)

          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => toggle(dept.id)}
              className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-muted/40 cursor-pointer ${
                isSelected ? "bg-primary/5" : "opacity-50"
              }`}
            >
              <span className={`text-[11px] font-black font-mono w-6 shrink-0 ${idx === 0 ? "text-status-warning" : "text-muted-foreground"}`}>
                #{idx + 1}
              </span>

              <div className={`w-5 h-5 shrink-0 border flex items-center justify-center ${
                  selectedIds.length > 0 && selectedIds.includes(dept.id)
                    ? "border-primary bg-primary"
                    : "border-border bg-background"
                }`}>
                  {selectedIds.length > 0 && selectedIds.includes(dept.id) && (
                    <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

              <p className="text-xs font-bold truncate flex-1 min-w-0 text-foreground">{dept.name}</p>

              {hasHealthData && (
                <span className={`text-sm font-black font-mono w-24 text-center shrink-0 ${hiTextColor}`}>
                  {hi !== null ? `${hi}%` : "—"}
                </span>
              )}

              <span className={`text-sm font-black font-mono w-16 text-center shrink-0 ${adherenceRateTextColor(dept.adherence)}`}>
                {dept.adherence}%
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
