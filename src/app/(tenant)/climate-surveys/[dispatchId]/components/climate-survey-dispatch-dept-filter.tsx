"use client"

import { useRef, useState, useEffect } from "react"
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs"
import { Filter, ChevronDown } from "lucide-react"

interface DeptOption {
  id: string
  name: string
}

interface ClimateSurveyDispatchDeptFilterProps {
  departments: DeptOption[]
}

export function ClimateSurveyDispatchDeptFilter({ departments }: ClimateSurveyDispatchDeptFilterProps): React.ReactElement {
  const [selectedIds, setSelectedIds] = useQueryState(
    "depts",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions({ shallow: false }),
  )
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function toggle(id: string): void {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id]
    void setSelectedIds(next.length > 0 ? next : null)
  }

  function clearAll(): void {
    void setSelectedIds(null)
  }

  function resolveLabel(): string {
    if (selectedIds.length === 0) return "Todos os departamentos"
    if (selectedIds.length === 1) {
      const dept = departments.find((d) => d.id === selectedIds[0])
      return dept?.name ?? "1 departamento"
    }
    return `${selectedIds.length} departamentos`
  }

  const label = resolveLabel()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-8 px-3 border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
      >
        <Filter className="w-3 h-3 text-muted-foreground" />
        <span>{label}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        {selectedIds.length > 0 && (
          <span className="ml-0.5 flex items-center justify-center w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold">
            {selectedIds.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 border border-border bg-card shadow-lg">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Filtrar por departamento
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] text-primary hover:underline font-medium"
              >
                Limpar filtro
              </button>
            )}
          </div>

          <div className="py-1">
            {departments.map((dept) => {
              const checked = selectedIds.includes(dept.id)
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => toggle(dept.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                >
                  <span
                    className={`flex-shrink-0 w-4 h-4 border flex items-center justify-center ${
                      checked ? "border-primary bg-primary" : "border-border bg-background"
                    }`}
                  >
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs text-foreground leading-snug">{dept.name}</span>
                </button>
              )
            })}
          </div>

          <div className="px-3 py-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              {selectedIds.length === 0
                ? "Exibindo dados de todos os departamentos"
                : "Exibindo dados dos departamentos selecionados"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
