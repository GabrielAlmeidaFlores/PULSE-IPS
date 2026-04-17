"use client"

import React, { useRef, useState, useEffect } from "react"
import { useQueryState, parseAsArrayOf, parseAsInteger } from "nuqs"
import { Filter, ChevronDown } from "lucide-react"
import type { UniqueQuestion } from "@/modules/dashboard/dashboard.service"

interface Props {
  questions: UniqueQuestion[]
}

export function QuestionFilter({ questions }: Props): React.ReactElement {
  const [selectedOrders, setSelectedOrders] = useQueryState(
    "q",
    parseAsArrayOf(parseAsInteger).withDefault([]).withOptions({ shallow: false }),
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

  function toggle(order: number): void {
    const next = selectedOrders.includes(order)
      ? selectedOrders.filter((o) => o !== order)
      : [...selectedOrders, order]
    void setSelectedOrders(next.length > 0 ? next : null)
  }

  function clearAll(): void {
    void setSelectedOrders(null)
  }

  function resolveLabel(): string {
    if (selectedOrders.length === 0) return "Todas as perguntas"
    if (selectedOrders.length === 1) return `Pergunta ${selectedOrders[0]}`
    return `${selectedOrders.length} perguntas`
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
        {selectedOrders.length > 0 && (
          <span className="ml-0.5 flex items-center justify-center w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold">
            {selectedOrders.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-80 border border-border bg-card shadow-lg">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Filtrar por pergunta
            </span>
            {selectedOrders.length > 0 && (
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
            {questions.map((q) => {
              const checked = selectedOrders.includes(q.order)
              return (
                <button
                  key={q.order}
                  type="button"
                  onClick={() => toggle(q.order)}
                  className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                >
                  <span
                    className={`mt-0.5 flex-shrink-0 w-4 h-4 border flex items-center justify-center ${
                      checked ? "border-primary bg-primary" : "border-border bg-background"
                    }`}
                  >
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Pergunta {q.order}
                    </span>
                    <span className="text-xs text-foreground leading-snug">{q.text}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="px-3 py-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              {selectedOrders.length === 0
                ? "Exibindo scores de todas as perguntas"
                : "Exibindo scores das perguntas selecionadas"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
