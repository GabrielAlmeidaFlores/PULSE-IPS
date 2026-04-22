import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { getBillingService } from "@/libs/integrations"
import { handleStripeWebhook } from "@/modules/billing/webhook.handler"

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 })
  }

  try {
    const billing = getBillingService()
    const event = billing.constructWebhookEvent(body, signature)
    await handleStripeWebhook(event)
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: "Falha ao processar webhook." }, { status: 400 })
  }
}
