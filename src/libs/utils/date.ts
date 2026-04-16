import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"

export function formatDatePtBR(date: Date | string): string {
  const parsed = typeof date === "string" ? parseISO(date) : date
  return format(parsed, "dd/MM/yyyy", { locale: ptBR })
}

export function formatDateTimePtBR(date: Date | string): string {
  const parsed = typeof date === "string" ? parseISO(date) : date
  return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelative(date: Date | string): string {
  const parsed = typeof date === "string" ? parseISO(date) : date
  return formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR })
}

export function isTokenExpired(expiresAt: Date): boolean {
  return isBefore(expiresAt, new Date())
}

export function isWithinWorkHours(
  timezone: string,
  workStartTime: string,
  workEndTime: string,
): boolean {
  const nowInTimezone = toZonedTime(new Date(), timezone)
  const currentHHMM = format(nowInTimezone, "HH:mm")

  const crossesMidnight = workEndTime < workStartTime
  if (crossesMidnight) {
    return currentHHMM >= workStartTime || currentHHMM <= workEndTime
  }
  return currentHHMM >= workStartTime && currentHHMM <= workEndTime
}

export function isFutureDate(date: Date): boolean {
  return isAfter(date, new Date())
}
