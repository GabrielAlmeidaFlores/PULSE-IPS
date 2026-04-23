import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { env } from "@/env"

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/consent",
  "/survey",
  "/report",
  "/checkout",
  "/accept-terms",
  "/learn-more",
  "/api/webhooks",
  "/super-admin/login",
]

const SUPER_ADMIN_PREFIX = "/super-admin"
const SUPER_ADMIN_API_PREFIX = "/api/super-admin"
const SKIP_LOG_PREFIXES = ["/api/internal/", "/api/jobs/", "/_next/", "/favicon"]

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.NEXTAUTH_SECRET)
}

function sanitizeHeaders(headers: Headers): Record<string, string> {
  const REDACTED = "[REDACTED]"
  const SENSITIVE = new Set(["cookie", "authorization", "x-api-key", "proxy-authorization"])
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = SENSITIVE.has(key.toLowerCase()) ? REDACTED : value
  })
  return result
}

function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  )
}

function shouldSkipLog(pathname: string): boolean {
  return SKIP_LOG_PREFIXES.some((p) => pathname.startsWith(p))
}

function fireLog(
  request: NextRequest,
  response: NextResponse,
  startMs: number,
  sessionInfo: SessionInfo,
): void {
  const { pathname, search } = request.nextUrl
  const redirectTo = response.headers.get("location") ?? undefined
  const isRedirect = response.status >= 300 && response.status < 400

  const payload = {
    method: request.method,
    path: pathname,
    query: search.length > 1 ? search.slice(1) : undefined,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
    requestHeaders: sanitizeHeaders(request.headers),
    responseStatus: response.status,
    durationMs: Date.now() - startMs,
    isRedirect,
    redirectTo,
    ...sessionInfo,
  }

  void fetch(new URL("/api/internal/request-log", request.url).toString(), {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-secret": env.CRON_SECRET },
    body: JSON.stringify(payload),
  }).catch(() => undefined)
}

interface SessionInfo {
  tenantId?: string | undefined
  userId?: string | undefined
  userType?: string | undefined
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const startMs = Date.now()

  if (shouldSkipLog(pathname)) {
    return processRequest(request)
  }

  const sessionInfo: SessionInfo = {}
  const response = await processRequestWithSession(request, sessionInfo)

  fireLog(request, response, startMs, sessionInfo)

  return response
}

function processRequest(request: NextRequest): Promise<NextResponse> {
  const sessionInfo: SessionInfo = {}
  return processRequestWithSession(request, sessionInfo)
}

async function processRequestWithSession(
  request: NextRequest,
  sessionInfo: SessionInfo,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get("pulse_session")?.value
  const superAdminCookie = request.cookies.get("pulse_super_admin_session")?.value

  if (pathname === "/login" || pathname === "/") {
    if (sessionCookie) {
      try {
        await jwtVerify(sessionCookie, getSecretKey())
        return NextResponse.redirect(new URL("/dashboard", request.url))
      } catch {
        /* session inválida — prossegue para a página de login */
      }
    }
  }

  if (pathname === "/super-admin/login") {
    if (superAdminCookie) {
      try {
        await jwtVerify(superAdminCookie, getSecretKey())
        return NextResponse.redirect(new URL("/super-admin/dashboard", request.url))
      } catch {
        /* session inválida — prossegue para a página de login */
      }
    }
  }

  if (isPublicPath(pathname)) return NextResponse.next()

  if (pathname.startsWith(SUPER_ADMIN_PREFIX) || pathname.startsWith(SUPER_ADMIN_API_PREFIX)) {
    if (!superAdminCookie) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url))
    }
    try {
      const { payload } = await jwtVerify(superAdminCookie, getSecretKey())
      const userId = payload["userId"]
      if (typeof userId === "string") sessionInfo.userId = userId
      sessionInfo.userType = "super_admin"
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL("/super-admin/login", request.url))
    }
  }

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, getSecretKey())
    const tenantId = payload["tenantId"]
    const userId = payload["userId"]
    if (typeof tenantId === "string") sessionInfo.tenantId = tenantId
    if (typeof userId === "string") sessionInfo.userId = userId
    sessionInfo.userType = "org_user"
    const response = NextResponse.next()
    if (typeof tenantId === "string") response.headers.set("x-tenant-id", tenantId)
    return response
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/jobs|api/internal).*)"],
}
