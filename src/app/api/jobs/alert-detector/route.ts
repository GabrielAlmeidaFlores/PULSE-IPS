import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { env } from "@/env"
import { detectLowScoreAlerts } from "@/modules/alerts/alert.service"

export async function POST(_request: Request): Promise<NextResponse> {
  const headersList = await headers()
  const secret = headersList.get("x-cron-secret")

  if (secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await detectLowScoreAlerts()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
