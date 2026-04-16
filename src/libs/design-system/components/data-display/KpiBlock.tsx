interface KpiBlockProps {
  label: string
  value: string | number
  sub?: string
  accent?: "blue" | "green" | "amber" | "red" | "neutral"
  icon?: React.ReactElement
  trend?: { value: number; label: string }
}

const accentClasses: Record<NonNullable<KpiBlockProps["accent"]>, { border: string; icon: string; badge: string }> = {
  blue:    { border: "border-l-primary", icon: "admin-accent-blue",  badge: "admin-bg-blue admin-accent-blue" },
  green:   { border: "border-l-[oklch(0.68_0.20_160)]", icon: "admin-accent-green", badge: "admin-bg-green admin-accent-green" },
  amber:   { border: "border-l-[oklch(0.72_0.18_75)]",  icon: "admin-accent-amber", badge: "admin-bg-amber admin-accent-amber" },
  red:     { border: "border-l-[oklch(0.62_0.22_25)]",  icon: "admin-accent-red",   badge: "admin-bg-red admin-accent-red" },
  neutral: { border: "border-l-border",                 icon: "text-muted-foreground", badge: "bg-muted text-muted-foreground" },
}

export function KpiBlock({ label, value, sub, accent = "neutral", icon, trend }: KpiBlockProps): React.ReactElement {
  const cls = accentClasses[accent]
  const trendPositive = trend && trend.value >= 0

  return (
    <div
      className={`bg-card border border-border border-l-4 ${cls.border} p-4 flex flex-col gap-2`}
      style={{ borderRadius: 0 }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground leading-tight">
          {label}
        </span>
        {icon && (
          <span className={`${cls.icon} shrink-0`}>
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold leading-none tracking-tight text-foreground">
          {value}
        </span>
        {trend && (
          <span
            className={`text-[11px] font-semibold px-1.5 py-0.5 ${trendPositive ? "admin-bg-green admin-accent-green" : "admin-bg-red admin-accent-red"}`}
            style={{ borderRadius: 0 }}
          >
            {trendPositive ? "+" : ""}{trend.value}% {trend.label}
          </span>
        )}
      </div>

      {sub && (
        <span className="text-[11px] text-muted-foreground leading-tight">{sub}</span>
      )}
    </div>
  )
}
