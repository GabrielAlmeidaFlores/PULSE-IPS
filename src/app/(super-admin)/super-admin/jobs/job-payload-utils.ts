export function extractJobPayloadTenantId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null
  const p = payload as Record<string, unknown>
  return typeof p["tenantId"] === "string" ? p["tenantId"] : null
}
