import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { env } from "@/env"
import { checkDispatchAdherence } from "@/modules/surveys/survey-dispatch.service"

export async function POST(): Promise<NextResponse> {
  const headersList = await headers()
  const secret = headersList.get("x-cron-secret")

  if (secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await checkDispatchAdherence()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
