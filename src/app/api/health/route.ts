import { healthService } from "@/modules/health/health.service"
import { NextResponse } from "next/server"

export async function GET(): Promise<NextResponse> {
  const dbOk = await healthService.checkDatabase()
  if (dbOk) {
    return NextResponse.json({ status: "ok" })
  }
  return NextResponse.json({ status: "error" }, { status: 503 })
}
