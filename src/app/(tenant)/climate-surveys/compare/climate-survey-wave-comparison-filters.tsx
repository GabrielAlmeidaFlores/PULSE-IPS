"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { NativeSelect } from "@/components/ui/native-select"

export interface ClimateSurveyWaveFilterOption {
  id: string
  label: string
}

interface ClimateSurveyWaveComparisonFiltersProps {
  options: ClimateSurveyWaveFilterOption[]
  baseId: string
  compareId: string
}

export function ClimateSurveyWaveComparisonFilters({
  options,
  baseId,
  compareId,
}: ClimateSurveyWaveComparisonFiltersProps): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: "base" | "compare", value: string): void {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="px-4 py-3 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Onda base</span>
          <NativeSelect
            value={baseId}
            onChange={(event) => { updateParam("base", event.target.value) }}
            containerClassName="min-w-[240px]"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Onda comparada</span>
          <NativeSelect
            value={compareId}
            onChange={(event) => { updateParam("compare", event.target.value) }}
            containerClassName="min-w-[240px]"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  )
}
