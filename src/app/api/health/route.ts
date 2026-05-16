import { healthService } from "@/modules/health/health.service"
import { NextResponse } from "next/server"

export async function GET(): Promise<NextResponse> {
  const dbOk = await healthService.checkDatabase()
  if (dbOk) {
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store, max-age=0" } })
  }
  return NextResponse.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } })
}
