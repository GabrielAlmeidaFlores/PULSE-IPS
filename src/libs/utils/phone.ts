export function normalizePhoneToE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`
  }

  if (raw.trimStart().startsWith("+") && !digits.startsWith("55") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`
  }

  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    return `+55${digits}`
  }

  return null
}
