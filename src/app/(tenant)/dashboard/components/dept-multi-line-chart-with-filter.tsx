"use client"

import { useState } from "react"
import { DeptMultiLineChart, CHART_PALETTE } from "@/app/(tenant)/dashboard/components/dept-charts"
import type { ChartMonthPoint } from "@/modules/dashboard/dashboard.service"

interface Props {
  data: ChartMonthPoint[]
  deptNames: string[]
}

export function DeptMultiLineChartWithFilter({ data, deptNames }: Props): React.ReactElement {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  function toggle(name: string): void {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  function selectOnly(name: string): void {
    const allOthers = new Set(deptNames.filter((n) => n !== name))
    setHidden((prev) => {
      const allHiddenExceptThis = prev.size === allOthers.size && [...allOthers].every((n) => prev.has(n))
      return allHiddenExceptThis ? new Set() : allOthers
    })
  }

  const visibleNames = deptNames.filter((n) => !hidden.has(n))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 px-1">
        {deptNames.map((name, i) => {
          const color = CHART_PALETTE[i % CHART_PALETTE.length] ?? "#2563eb"
          const isHidden = hidden.has(name)
          return (
            <button
              key={name}
              type="button"
              title="Clique para alternar · Duplo clique para exibir só este"
              onClick={() => toggle(name)}
              onDoubleClick={(e) => { e.preventDefault(); selectOnly(name) }}
              className={`inline-flex items-center gap-1.5 px-2 py-1 border text-[10px] font-bold tracking-wide uppercase transition-all select-none
                ${isHidden
                  ? "border-border bg-muted/30 text-muted-foreground/50 line-through"
                  : "border-border bg-card text-foreground hover:bg-muted/40"
                }`}
              style={{ borderRadius: 0 }}
            >
              <span
                className="w-2.5 h-2.5 shrink-0 transition-opacity"
                style={{ background: color, opacity: isHidden ? 0.25 : 1 }}
              />
              {name}
            </button>
          )
        })}
        {hidden.size > 0 && (
          <button
            type="button"
            onClick={() => setHidden(new Set())}
            className="inline-flex items-center px-2 py-1 text-[10px] font-bold tracking-wide uppercase text-primary hover:underline transition-colors"
            style={{ borderRadius: 0 }}
          >
            Exibir todos
          </button>
        )}
      </div>

      {visibleNames.length > 0 ? (
        <DeptMultiLineChart data={data} deptNames={visibleNames} />
      ) : (
        <div className="flex items-center justify-center h-[260px] text-xs text-muted-foreground">
          Nenhum setor selecionado
        </div>
      )}
    </div>
  )
}
