interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
}

export function StatCard({ title, value, subtitle }: StatCardProps): React.ReactElement {
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
