"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { storage } from "@/libs/local-storage"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => undefined,
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>(() => {
    return storage.get(storage.KEYS.theme) === "dark" ? "dark" : "light"
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  const setTheme = useCallback((next: Theme): void => {
    setThemeState(next)
    storage.set(storage.KEYS.theme, next)
    document.cookie = `pulse:theme=${next};path=/;max-age=31536000;SameSite=Lax`
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
