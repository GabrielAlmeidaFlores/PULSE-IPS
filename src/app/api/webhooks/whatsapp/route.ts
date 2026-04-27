import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/env"

export function GET(request: NextRequest): NextResponse {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 })
  }

  return new NextResponse("Forbidden", { status: 403 })
}

export function POST(): NextResponse {
  return NextResponse.json({ status: "ok" })
}
