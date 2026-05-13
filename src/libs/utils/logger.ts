const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"

const COLORS = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
} as const

type LogLevel = "info" | "success" | "warn" | "error" | "debug"

interface LogEntry {
  level: LogLevel
  origin: string
  message: string
  data?: unknown
}

function formatTimestamp(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "")
}

function levelLabel(level: LogLevel): string {
  const labels: Record<LogLevel, string> = {
    success: `${COLORS.green}${BOLD} OK  ${RESET}`,
    info:    `${COLORS.cyan}${BOLD} INF ${RESET}`,
    warn:    `${COLORS.yellow}${BOLD} WRN ${RESET}`,
    error:   `${COLORS.red}${BOLD} ERR ${RESET}`,
    debug:   `${COLORS.gray}${BOLD} DBG ${RESET}`,
  }
  return labels[level]
}

function formatData(data: unknown): string {
  if (data === undefined || data === null) return ""
  const serialized = typeof data === "string" ? data : JSON.stringify(data)
  return ` ${DIM}${serialized}${RESET}`
}

function msgColor(level: LogLevel, message: string): string {
  if (level === "error") return `${COLORS.red}${message}${RESET}`
  if (level === "warn") return `${COLORS.yellow}${message}${RESET}`
  if (level === "success") return `${COLORS.green}${message}${RESET}`
  return `${COLORS.white}${message}${RESET}`
}

function write({ level, origin, message, data }: LogEntry): void {
  const timestamp = `${COLORS.gray}${DIM}${formatTimestamp()}${RESET}`
  const tag = levelLabel(level)
  const src = `${COLORS.blue}[${origin}]${RESET}`
  const msg = msgColor(level, message)
  const line = `${timestamp} ${tag} ${src} ${msg}${formatData(data)}`

  if (level === "error" || level === "warn") {
    process.stderr.write(`${line}\n`)
  } else {
    process.stdout.write(`${line}\n`)
  }
}

export interface Logger {
  info: (message: string, data?: unknown) => void
  success: (message: string, data?: unknown) => void
  warn: (message: string, data?: unknown) => void
  error: (message: string, data?: unknown) => void
  debug: (message: string, data?: unknown) => void
}

export function createLogger(origin: string): Logger {
  return {
    info:    (message, data) => { write({ level: "info",    origin, message, data }) },
    success: (message, data) => { write({ level: "success", origin, message, data }) },
    warn:    (message, data) => { write({ level: "warn",    origin, message, data }) },
    error:   (message, data) => { write({ level: "error",   origin, message, data }) },
    debug:   (message, data) => { write({ level: "debug",   origin, message, data }) },
  }
}

export const logger = createLogger("app")
