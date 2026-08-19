const KEYS = {
  lastOrgSlug: "pulse:last-org-slug",
  theme: "pulse:theme",
  surveyIdentifier: "pulse:survey-identifier",
} as const

const SESSION_KEY_PREFIXES = {
  climateSurveyDraft: "pulse:climate-survey-draft:",
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

function getSession(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function setSession(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    return
  }
}

function removeSession(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    return
  }
}

function climateSurveyDraftKey(token: string): string {
  return `${SESSION_KEY_PREFIXES.climateSurveyDraft}${token}`
}

export const storage = {
  get,
  set,
  remove,
  KEYS,
  getSession,
  setSession,
  removeSession,
  SESSION_KEY_PREFIXES,
  climateSurveyDraftKey,
}
