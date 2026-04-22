"use client"

import { useRouter, usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export interface SelectFilterField {
  type: "select"
  key: string
  label: string
  width?: string
  options: { value: string; label: string }[]
  allLabel?: string
}

export interface TextFilterField {
  type: "text"
  key: string
  label: string
  placeholder?: string
  width?: string
  mono?: boolean
}

export interface DateFilterField {
  type: "date"
  key: string
  label: string
  width?: string
}

export type FilterField = SelectFilterField | TextFilterField | DateFilterField

export interface FilterBarProps {
  fields: FilterField[]
  values: Record<string, string | undefined>
  title?: string
}

function hasActiveFilter(values: Record<string, string | undefined>): boolean {
  return Object.values(values).some((v) => v !== undefined && v.length > 0)
}

function buildClearUrl(
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  fields: FilterField[],
): string {
  const params = new URLSearchParams(searchParams.toString())
  for (const field of fields) {
    params.delete(field.key)
  }
  params.delete("page")
  return `${pathname}?${params.toString()}`
}

export function FilterBar({ fields, values, title = "Filtros" }: FilterBarProps): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const v = value ?? ""
      const params = new URLSearchParams(searchParams.toString())
      if (v.length === 0 || v === "all") {
        params.delete(key)
      } else {
        params.set(key, v)
      }
      params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  function handleClear(): void {
    router.push(buildClearUrl(pathname, searchParams, fields))
  }

  const active = hasActiveFilter(values)

  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="px-4 py-2.5 border-b border-border bg-muted flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{title}</span>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] tracking-widest uppercase font-bold text-muted-foreground hover:text-foreground"
            onClick={handleClear}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="px-4 py-3 flex flex-wrap gap-3 items-end">
        {fields.map((field) => {
          if (field.type === "select") {
            return (
              <div key={field.key} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{field.label}</span>
                <Select
                  value={values[field.key] ?? "all"}
                  onValueChange={(v) => { updateFilter(field.key, v) }}
                >
                  <SelectTrigger className={`${field.width ?? "w-[130px]"} h-8 text-xs`} style={{ borderRadius: 0 }}>
                    <SelectValue placeholder={field.allLabel ?? "Todos"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{field.allLabel ?? "Todos"}</SelectItem>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          }

          if (field.type === "text") {
            return (
              <div key={field.key} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{field.label}</span>
                <Input
                  className={`${field.width ?? "w-[200px]"} h-8 text-xs ${field.mono === true ? "font-mono" : ""}`}
                  style={{ borderRadius: 0 }}
                  placeholder={field.placeholder}
                  defaultValue={values[field.key] ?? ""}
                  onBlur={(e) => { updateFilter(field.key, e.target.value) }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateFilter(field.key, e.currentTarget.value)
                  }}
                />
              </div>
            )
          }

          return (
            <div key={field.key} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{field.label}</span>
              <Input
                type="date"
                className={`${field.width ?? "w-[140px]"} h-8 text-xs`}
                style={{ borderRadius: 0 }}
                defaultValue={values[field.key] ?? ""}
                onChange={(e) => { updateFilter(field.key, e.target.value) }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
