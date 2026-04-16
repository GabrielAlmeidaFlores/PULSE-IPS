import { headers } from "next/headers"
import { NextResponse } from "next/server"
import type { Stripe } from "stripe"
import { getBillingService } from "@/libs/integrations"
import { handleStripeWebhook } from "@/modules/billing/webhook.handler"

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const billing = getBillingService()
    event = billing.constructWebhookEvent(body, signature) as Stripe.Event
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    await handleStripeWebhook(event)
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
