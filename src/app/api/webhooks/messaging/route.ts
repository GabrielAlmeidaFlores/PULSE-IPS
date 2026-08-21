import { NextResponse } from "next/server"
import { env } from "@/env"
import { logger } from "@/libs/logger"
import {
  applyMessageDeliveryStatus,
  parseMessagingDeliveryWebhookPayload,
} from "@/modules/messaging/messaging.service"

function isAuthorized(request: Request): boolean {
  const configuredSecret = env.MESSAGING_WEBHOOK_SECRET
  if (configuredSecret === undefined || configuredSecret === "") {
    return env.NODE_ENV !== "production"
  }
  const headerSecret = request.headers.get("x-messaging-webhook-secret")
  if (headerSecret === configuredSecret) return true
  const url = new URL(request.url)
  return url.searchParams.get("secret") === configuredSecret
}

export function GET(request: Request): NextResponse {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  const url = new URL(request.url)
  const challenge = url.searchParams.get("hub.challenge") ?? url.searchParams.get("challenge")
  if (challenge !== null) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ ok: true })
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const events = parseMessagingDeliveryWebhookPayload(payload)
  if (events.length === 0) {
    return NextResponse.json({ received: true, updated: 0 })
  }

  let updated = 0
  for (const event of events) {
    try {
      const result = await applyMessageDeliveryStatus(event)
      if (result !== null) updated += 1
    } catch (error) {
      logger.error({ err: error, externalId: event.externalId }, "falha ao atualizar status da mensagem")
    }
  }

  return NextResponse.json({ received: true, updated })
}
