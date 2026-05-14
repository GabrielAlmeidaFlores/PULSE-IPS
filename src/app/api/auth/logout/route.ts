import { NextResponse } from "next/server"
import { env } from "@/env"
import { logout } from "@/modules/auth/auth.service"

export async function GET(): Promise<NextResponse> {
  await logout()
  return NextResponse.redirect(new URL("/login", env.NEXT_PUBLIC_APP_URL))
}
