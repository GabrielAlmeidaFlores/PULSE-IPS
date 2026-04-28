export function toHealthIndex(normalizedAvg: number): number {
  return Math.round(((normalizedAvg - 1) / 4) * 100)
}

export function healthIndexLabel(hi: number | null): string {
  if (hi === null) return "—"
  if (hi >= 62) return "Saudável"
  if (hi >= 37) return "Atenção"
  return "Crítico"
}

export function healthIndexAccent(hi: number | null): string {
  if (hi === null) return "text-muted-foreground"
  if (hi >= 62) return "text-status-success"
  if (hi >= 37) return "text-status-warning"
  return "text-status-danger"
}

export function healthIndexBarColor(hi: number): string {
  if (hi >= 62) return "bg-status-success"
  if (hi >= 37) return "bg-status-warning"
  return "bg-status-danger"
}

export function healthIndexChartColor(hi: number): string {
  if (hi >= 62) return "var(--status-success)"
  if (hi >= 37) return "var(--status-warning)"
  return "var(--status-danger)"
}

export function adherenceRateTextColor(pct: number): string {
  if (pct >= 80) return "text-status-success"
  if (pct >= 50) return "text-status-warning"
  return "text-status-danger"
}

export function adherenceRateBarClass(pct: number): string {
  if (pct >= 80) return "bg-status-success"
  if (pct >= 50) return "bg-status-warning"
  return "bg-status-danger"
}

export function trendDirectionTextColor(trend: string | null): string {
  if (trend === "up") return "text-status-success"
  if (trend === "down") return "text-status-danger"
  return "text-muted-foreground"
}
