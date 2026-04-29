import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { env } from "@/env"
import { verifyCronSecret } from "@/libs/utils/cron-auth"
import { runHealthSurveyDispatcher, runHealthSurveyAutoDispatchScheduler } from "@/modules/health-surveys/health-survey-dispatch.service"

export async function POST(_request: Request): Promise<NextResponse> {
  const headersList = await headers()
  const secret = headersList.get("x-cron-secret")

  if (!verifyCronSecret(secret, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [dispatchResult, autoResult] = await Promise.all([runHealthSurveyDispatcher(), runHealthSurveyAutoDispatchScheduler()])
    return NextResponse.json({ dispatch: dispatchResult, auto: autoResult })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
