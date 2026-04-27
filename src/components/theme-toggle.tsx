"use client"

import React from "react"
import { useTheme } from "@/components/theme-provider"
import { Sun, Moon } from "lucide-react"

interface ThemeToggleProps {
  variant?: "icon" | "labeled"
  className?: string
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps): React.ReactElement {
  const { theme, setTheme } = useTheme()

  const toggle = (): void => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (variant === "labeled") {
    return (
      <button
        onClick={toggle}
        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground ${className}`}
        aria-label="Alternar tema"
      >
        <span className="relative w-4 h-4 shrink-0">
          <Sun className="absolute inset-0 w-4 h-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute inset-0 w-4 h-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </span>
        <span>
          <span className="dark:hidden">Tema escuro</span>
          <span className="hidden dark:inline">Tema claro</span>
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground ${className}`}
      aria-label="Alternar tema"
    >
      <span className="relative w-4 h-4">
        <Sun className="absolute inset-0 w-4 h-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute inset-0 w-4 h-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      </span>
    </button>
  )
}
