import { NextResponse } from "next/server"
import { z } from "zod"
import { registerEmailOpen } from "@/modules/messaging/survey-email.service"

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
)

interface RouteParams {
  params: Promise<{ trackingToken: string }>
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { trackingToken } = await params
  const parsed = z.string().uuid().safeParse(trackingToken)
  if (parsed.success) {
    await registerEmailOpen(parsed.data).catch(() => undefined)
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}
