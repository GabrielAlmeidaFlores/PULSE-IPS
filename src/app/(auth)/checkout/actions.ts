"use server"

import { createOrg } from "@/modules/organizations/organization.service"
import { sendInvite } from "@/modules/auth/invite.service"
import { createCheckoutSession } from "@/modules/billing/billing.service"
import { env } from "@/env"
import { getPlanPriceWithPlan } from "@/modules/plans/plan.service"

interface CheckoutResult {
  error?: string
  checkoutUrl?: string
}

export async function selfServiceCheckoutAction(input: {
  orgName: string
  slug: string
  adminEmail: string
  priceId: string
}): Promise<CheckoutResult> {
  try {
    const planPrice = await getPlanPriceWithPlan(input.priceId)
    if (!planPrice) return { error: "Plano não encontrado ou indisponível." }
    if (!planPrice.externalPriceId) return { error: "Este plano ainda não está configurado para pagamento. Entre em contato com o suporte." }

    const org = await createOrg({ name: input.orgName, slug: input.slug })

    await sendInvite(org.id, input.adminEmail, "admin")

    const successUrl = `${env.NEXT_PUBLIC_APP_URL}/checkout/success`
    const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/checkout?priceId=${input.priceId}`

    const checkoutUrl = await createCheckoutSession(org.id, planPrice.externalPriceId ?? "", {
      successUrl,
      cancelUrl,
    })

    return { checkoutUrl }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("Slug already taken")) return { error: "Esse identificador já está em uso. Tente outro." }
    return { error: msg }
  }
}
