import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { env } from "@/env"
import { verifyCronSecret } from "@/libs/utils/cron-auth"
import { sendPgrReviewReminders } from "@/modules/pgr/pgr.service"

export async function POST(): Promise<NextResponse> {
  const headersList = await headers()
  const secret = headersList.get("x-cron-secret")

  if (!verifyCronSecret(secret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendPgrReviewReminders()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
