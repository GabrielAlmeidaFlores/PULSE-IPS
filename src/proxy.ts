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

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.NEXTAUTH_SECRET)
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) return NextResponse.next()

  const sessionCookie = request.cookies.get("pulse_session")?.value
  const superAdminCookie = request.cookies.get("pulse_super_admin_session")?.value

  if (pathname.startsWith(SUPER_ADMIN_PREFIX) || pathname.startsWith(SUPER_ADMIN_API_PREFIX)) {
    if (!superAdminCookie) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url))
    }
    try {
      await jwtVerify(superAdminCookie, getSecretKey())
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
    const tenantId = payload["tenantId"] as string | undefined
    const response = NextResponse.next()
    if (tenantId) response.headers.set("x-tenant-id", tenantId)
    return response
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/jobs).*)"],
}
