import { randomBytes } from "crypto"
import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { env } from "@/env"
import { extractClientIp } from "@/libs/utils/client-ip"

function generateNonce(): string {
  return randomBytes(16).toString("base64")
}

function buildCspDirectives(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].join("; ")
}

function createNextWithNonce(request: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", buildCspDirectives(nonce))
  return NextResponse.next({ request: { headers: requestHeaders } })
}

function addCspToResponse(response: NextResponse, nonce: string): void {
  if (response.status >= 300 && response.status < 400) return
  response.headers.set("Content-Security-Policy", buildCspDirectives(nonce))
}

const SUPER_ADMIN_LOGIN_PATH = "/super-admin/login"

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/consent",
  "/health-survey",
  "/report",
  "/checkout",
  "/accept-terms",
  "/learn-more",
  "/privacy-policy",
  "/platform-terms",
  "/consent-terms",
  "/api/webhooks",
  "/api/health",
  "/api/csp-report",
  "/data-deletion",
  SUPER_ADMIN_LOGIN_PATH,
]

const TENANT_PATHS = [
  "/dashboard",
  "/employees",
  "/departments",
  "/health-surveys",
  "/reports",
  "/action-plans",
  "/documents",
  "/alerts",
  "/pgr",
  "/settings",
  "/billing",
]

const SUPER_ADMIN_PREFIX = "/super-admin"
const SUPER_ADMIN_API_PREFIX = "/api/super-admin"
const SKIP_LOG_PREFIXES = ["/api/internal/", "/api/jobs/", "/api/auth/", "/api/health", "/api/csp-report", "/_next/", "/favicon"]

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isTenantPath(pathname: string): boolean {
  return TENANT_PATHS.some((p) => pathname.startsWith(p))
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
  return extractClientIp(request.headers)
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

  void fetch(`${env.INTERNAL_API_URL}/api/internal/request-log`, {
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

async function tryRedirectIfAlreadyLoggedIn(
  pathname: string,
  sessionCookie: string | undefined,
  superAdminCookie: string | undefined,
  request: NextRequest,
): Promise<NextResponse | null> {
  if (pathname === "/login") {
    if (sessionCookie) {
      try {
        await jwtVerify(sessionCookie, getSecretKey())
        return NextResponse.redirect(new URL("/dashboard", request.url))
      } catch { return null }
    }
  }
  if (pathname === SUPER_ADMIN_LOGIN_PATH && superAdminCookie) {
    try {
      await jwtVerify(superAdminCookie, getSecretKey())
      return NextResponse.redirect(new URL("/super-admin/dashboard", request.url))
    } catch { return null }
  }
  return null
}

async function handleSuperAdminRoute(
  superAdminCookie: string | undefined,
  request: NextRequest,
  sessionInfo: SessionInfo,
  nonce: string,
): Promise<NextResponse> {
  if (!superAdminCookie) {
    return NextResponse.redirect(new URL(SUPER_ADMIN_LOGIN_PATH, request.url))
  }
  try {
    const { payload } = await jwtVerify(superAdminCookie, getSecretKey())
    const userId = payload["userId"]
    if (typeof userId === "string") sessionInfo.userId = userId
    sessionInfo.userType = "super_admin"
    return createNextWithNonce(request, nonce)
  } catch {
    return NextResponse.redirect(new URL(SUPER_ADMIN_LOGIN_PATH, request.url))
  }
}

async function handleTenantRoute(
  sessionCookie: string | undefined,
  request: NextRequest,
  sessionInfo: SessionInfo,
  nonce: string,
): Promise<NextResponse> {
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
    const response = createNextWithNonce(request, nonce)
    if (typeof tenantId === "string") response.headers.set("x-tenant-id", tenantId)
    return response
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const startMs = Date.now()
  const nonce = generateNonce()

  if (shouldSkipLog(pathname)) {
    const response = await processRequest(request, nonce)
    addCspToResponse(response, nonce)
    return response
  }

  const sessionInfo: SessionInfo = {}
  const response = await processRequestWithSession(request, sessionInfo, nonce)
  addCspToResponse(response, nonce)

  fireLog(request, response, startMs, sessionInfo)

  return response
}

function processRequest(request: NextRequest, nonce: string): Promise<NextResponse> {
  const sessionInfo: SessionInfo = {}
  return processRequestWithSession(request, sessionInfo, nonce)
}

async function processRequestWithSession(
  request: NextRequest,
  sessionInfo: SessionInfo,
  nonce: string,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get("pulse_session")?.value
  const superAdminCookie = request.cookies.get("pulse_super_admin_session")?.value

  const loginRedirect = await tryRedirectIfAlreadyLoggedIn(pathname, sessionCookie, superAdminCookie, request)
  if (loginRedirect) return loginRedirect

  if (isPublicPath(pathname)) return createNextWithNonce(request, nonce)

  if (pathname.startsWith(SUPER_ADMIN_PREFIX) || pathname.startsWith(SUPER_ADMIN_API_PREFIX)) {
    return handleSuperAdminRoute(superAdminCookie, request, sessionInfo, nonce)
  }

  if (isTenantPath(pathname)) {
    return handleTenantRoute(sessionCookie, request, sessionInfo, nonce)
  }

  return createNextWithNonce(request, nonce)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/jobs|api/internal).*)"],
}
