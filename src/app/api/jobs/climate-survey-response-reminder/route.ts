import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { env } from "@/env"
import { verifyCronSecret } from "@/libs/utils/cron-auth"
import { runClimateSurveyResponseReminder } from "@/modules/climate-surveys/climate-survey-reminder.service"

export async function POST(_request: Request): Promise<NextResponse> {
  const headersList = await headers()
  const secret = headersList.get("x-cron-secret")

  if (!verifyCronSecret(secret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await runClimateSurveyResponseReminder()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
