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
  if (hi >= 62) return "text-green-600"
  if (hi >= 37) return "text-yellow-600"
  return "text-red-600"
}

export function healthIndexBarColor(hi: number): string {
  if (hi >= 62) return "bg-green-500"
  if (hi >= 37) return "bg-yellow-500"
  return "bg-red-500"
}

export function healthIndexChartColor(hi: number): string {
  if (hi >= 62) return "#16a34a"
  if (hi >= 37) return "#d97706"
  return "#dc2626"
}
