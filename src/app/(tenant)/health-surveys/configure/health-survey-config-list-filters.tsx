"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Search } from "lucide-react"

interface Department {
  id: string
  name: string
}

interface HealthSurveyConfigListFiltersProps {
  departments: Department[]
}

const FREQUENCY_OPTIONS = [
  { value: "", label: "Todas as frequências" },
  { value: "daily", label: "Diária" },
  { value: "twice_weekly", label: "2× por semana" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
]

export function HealthSurveyConfigListFilters({ departments }: HealthSurveyConfigListFiltersProps): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string): void => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      params.set("page", "1")
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const q = searchParams.get("q") ?? ""
  const frequency = searchParams.get("frequency") ?? ""
  const departmentId = searchParams.get("departmentId") ?? ""

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={q}
          onChange={(e) => updateParam("q", e.target.value)}
          className="pl-7 pr-3 py-1.5 text-[12px] bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors w-48"
          style={{ borderRadius: 0 }}
        />
      </div>

      <select
        value={frequency}
        onChange={(e) => updateParam("frequency", e.target.value)}
        className="py-1.5 px-2 text-[12px] bg-input border border-input-border text-foreground focus:outline-none focus:border-primary transition-colors"
        style={{ borderRadius: 0 }}
      >
        {FREQUENCY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {departments.length > 0 && (
        <select
          value={departmentId}
          onChange={(e) => updateParam("departmentId", e.target.value)}
          className="py-1.5 px-2 text-[12px] bg-input border border-input-border text-foreground focus:outline-none focus:border-primary transition-colors"
          style={{ borderRadius: 0 }}
        >
          <option value="">Todos os setores</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}
