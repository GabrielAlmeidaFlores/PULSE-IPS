interface HeadersLike {
  get(name: string): string | null
}

export function extractClientIp(headers: HeadersLike): string | undefined {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    undefined
  )
}
