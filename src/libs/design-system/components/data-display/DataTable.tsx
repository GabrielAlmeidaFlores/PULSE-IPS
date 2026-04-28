interface DataTableColumn {
  label: string
  align?: "left" | "center" | "right"
  className?: string
}

interface DataTableProps {
  columns: DataTableColumn[]
  children: React.ReactNode
  total?: number
  emptyMessage?: string
  pagination?: React.ReactNode
}

function alignClass(align: "left" | "center" | "right" | undefined): string {
  if (align === "center") return "text-center"
  if (align === "right") return "text-right"
  return "text-left"
}

export function DataTable({
  columns,
  children,
  total,
  emptyMessage = "Nenhum registro.",
  pagination,
}: DataTableProps): React.ReactElement {
  return (
    <div className="border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${alignClass(col.align)} ${col.className ?? ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {total === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
      {pagination !== undefined ? (
        pagination
      ) : (
        total !== undefined && (
          <div className="border-t border-border px-4 py-2">
            <span className="text-[10px] text-muted-foreground">
              {total} {total === 1 ? "registro" : "registros"}
            </span>
          </div>
        )
      )}
    </div>
  )
}
