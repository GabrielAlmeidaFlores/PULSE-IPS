import { timingSafeEqual } from "crypto"

export function verifyCronSecret(received: string | null, expected: string): boolean {
  if (!received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
