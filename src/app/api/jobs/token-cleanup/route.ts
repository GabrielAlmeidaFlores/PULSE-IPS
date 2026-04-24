import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { env } from "@/env"
import { verifyCronSecret } from "@/libs/utils/cron-auth"
import { cleanupExpiredTokens } from "@/modules/surveys/survey-response.service"

export async function POST(_request: Request): Promise<NextResponse> {
  const headersList = await headers()
  const secret = headersList.get("x-cron-secret")

  if (!verifyCronSecret(secret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await cleanupExpiredTokens()
    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
