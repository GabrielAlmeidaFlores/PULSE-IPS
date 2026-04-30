import { createHmac } from "crypto"
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (env.WHATSAPP_APP_SECRET !== undefined) {
    const signature = request.headers.get("x-hub-signature-256") ?? ""
    const body = await request.text()
    const expected = `sha256=${createHmac("sha256", env.WHATSAPP_APP_SECRET).update(body).digest("hex")}`
    if (signature !== expected) {
      return new NextResponse("Forbidden", { status: 403 })
    }
  }

  return NextResponse.json({ status: "ok" })
}
