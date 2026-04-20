export function adherenceClass(rate: number): string {
  if (rate >= 80) return "text-green-600"
  if (rate >= 50) return "text-yellow-600"
  return "text-red-500"
}

export function adherenceBarClass(pct: number): string {
  if (pct >= 80) return "bg-green-500"
  if (pct >= 50) return "bg-yellow-500"
  return "bg-red-500"
}
