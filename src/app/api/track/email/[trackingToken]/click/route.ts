import { NextResponse } from "next/server"
import { z } from "zod"
import { env } from "@/env"
import { registerEmailClick } from "@/modules/messaging/survey-email.service"

interface RouteParams {
  params: Promise<{ trackingToken: string }>
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { trackingToken } = await params
  const parsed = z.string().uuid().safeParse(trackingToken)
  if (!parsed.success) {
    return NextResponse.redirect(env.NEXT_PUBLIC_APP_URL)
  }

  const log = await registerEmailClick(parsed.data)
  if (log === null) {
    return NextResponse.redirect(env.NEXT_PUBLIC_APP_URL)
  }

  return NextResponse.redirect(log.surveyLink)
}
