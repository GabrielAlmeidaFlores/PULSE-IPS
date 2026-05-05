import { type NextRequest, NextResponse } from "next/server"
import { logout } from "@/modules/auth/auth.service"

export async function GET(request: NextRequest): Promise<NextResponse> {
  await logout()
  return NextResponse.redirect(new URL("/login", request.url))
}
