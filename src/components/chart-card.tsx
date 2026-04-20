interface ChartCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  bodyClassName?: string
  children: React.ReactNode
}

export function ChartCard({
  title,
  subtitle,
  action,
  bodyClassName = "px-4 py-4",
  children,
}: ChartCardProps): React.ReactElement {
  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest">{title}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
