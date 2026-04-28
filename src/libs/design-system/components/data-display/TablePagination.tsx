"use client"

import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TablePaginationProps {
  total: number
  defaultPageSize?: number
  pageSizeOptions?: number[]
}

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50]

export function TablePagination({
  total,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: TablePaginationProps): React.ReactElement {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || defaultPageSize))
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function buildUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    return `${pathname}?${params.toString()}`
  }

  function handlePageSizeChange(value: string | null): void {
    router.push(buildUrl({ pageSize: value ?? String(pageSizeOptions[0] ?? DEFAULT_PAGE_SIZE), page: "1" }))
  }

  const windowStart = Math.max(1, page - 2)
  const windowEnd = Math.min(totalPages, windowStart + 4)

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  return (
    <div className="border-t border-border px-4 py-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Linhas</span>
        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="h-6 w-16 text-[11px]" style={{ borderRadius: 0 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((s) => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground">
          {rangeStart}–{rangeEnd} de {total.toLocaleString("pt-BR")}
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Link href={buildUrl({ page: "1" })} aria-disabled={page === 1}>
            <Button variant="outline" size="icon" className="h-6 w-6" style={{ borderRadius: 0 }} disabled={page === 1}>
              <ChevronsLeft className="h-3 w-3" />
            </Button>
          </Link>
          <Link href={buildUrl({ page: String(page - 1) })} aria-disabled={page === 1}>
            <Button variant="outline" size="icon" className="h-6 w-6" style={{ borderRadius: 0 }} disabled={page === 1}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
          </Link>

          {windowStart > 1 && <span className="text-[10px] text-muted-foreground px-0.5">…</span>}
          {Array.from({ length: windowEnd - windowStart + 1 }, (_, j) => windowStart + j).map((p) => (
            <Link key={p} href={buildUrl({ page: String(p) })}>
              <Button
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-6 w-6 p-0 text-[10px] font-bold"
                style={{ borderRadius: 0 }}
              >
                {p}
              </Button>
            </Link>
          ))}
          {windowEnd < totalPages && <span className="text-[10px] text-muted-foreground px-0.5">…</span>}

          <Link href={buildUrl({ page: String(page + 1) })} aria-disabled={page === totalPages}>
            <Button variant="outline" size="icon" className="h-6 w-6" style={{ borderRadius: 0 }} disabled={page === totalPages}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
          <Link href={buildUrl({ page: String(totalPages) })} aria-disabled={page === totalPages}>
            <Button variant="outline" size="icon" className="h-6 w-6" style={{ borderRadius: 0 }} disabled={page === totalPages}>
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
