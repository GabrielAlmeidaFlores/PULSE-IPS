"use client"

import React from "react"
import { useTheme } from "@/components/theme-provider"
import { Sun, Moon } from "lucide-react"

export function ThemeSettings(): React.ReactElement {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: "light", label: "Claro", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Escuro", icon: <Moon className="h-4 w-4" /> },
  ] as const

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Aparência</p>
      </div>
      <div className="p-5">
        <p className="text-sm font-medium text-foreground mb-3">Tema da interface</p>
        <div className="flex gap-3">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                theme === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
