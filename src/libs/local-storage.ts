const KEYS = {
  lastOrgSlug: "pulse:last-org-slug",
} as const

type StorageKey = (typeof KEYS)[keyof typeof KEYS]

function get(key: StorageKey): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function set(key: StorageKey, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}

function remove(key: StorageKey): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key)
  } catch {
    return
  }
}

export const storage = { get, set, remove, KEYS }
