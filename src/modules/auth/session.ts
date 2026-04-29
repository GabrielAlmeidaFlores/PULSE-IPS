import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { env } from "@/env"
import type { SessionPayload, SuperAdminSessionPayload } from "@/modules/auth/auth.types"

const SESSION_COOKIE = "pulse_session"
const SUPER_ADMIN_SESSION_COOKIE = "pulse_super_admin_session"
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.NEXTAUTH_SECRET)
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey())

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function createSuperAdminSession(payload: SuperAdminSessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey())

  const cookieStore = await cookies()
  cookieStore.set(SUPER_ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  })
}

export async function getSuperAdminSession(): Promise<SuperAdminSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return payload as unknown as SuperAdminSessionPayload
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function destroySuperAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SUPER_ADMIN_SESSION_COOKIE)
}
