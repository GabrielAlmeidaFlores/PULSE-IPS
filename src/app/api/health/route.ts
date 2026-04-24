import { healthService } from "@/modules/health/health.service"
import { NextResponse } from "next/server"

export async function GET(): Promise<NextResponse> {
  const dbOk = await healthService.checkDatabase()
  if (dbOk) {
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() })
  }
  return NextResponse.json(
    { status: "error", timestamp: new Date().toISOString() },
    { status: 503 },
  )
}
