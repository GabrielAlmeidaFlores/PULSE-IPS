"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

interface DeptFilterProps {
  departments: { id: string; name: string }[]
}

export function DeptFilter({ departments }: DeptFilterProps): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedIds = new Set(searchParams.get("depts")?.split(",").filter(Boolean) ?? [])
  const allSelected = selectedIds.size === 0

  function toggle(id: string): void {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    const params = new URLSearchParams(searchParams.toString())
    if (next.size > 0) {
      params.set("depts", Array.from(next).join(","))
    } else {
      params.delete("depts")
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function clearAll(): void {
    router.push(pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
        Departamentos:
      </span>
      <button
        onClick={clearAll}
        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
          allSelected
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
        }`}
      >
        Todos
      </button>
      {departments.map((d) => {
        const active = selectedIds.has(d.id)
        return (
          <button
            key={d.id}
            onClick={() => toggle(d.id)}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {d.name}
          </button>
        )
      })}
    </div>
  )
}
