"use server"

import { z } from "zod"
import { createOrg } from "@/modules/organizations/organization.service"
import { sendInvite } from "@/modules/auth/invite.service"
import { createCheckoutSession } from "@/modules/billing/billing.service"
import { env } from "@/env"
import { getPlanPriceWithPlan } from "@/modules/plans/plan.service"

interface CheckoutResult {
  error?: string
  checkoutUrl?: string
}

const checkoutSchema = z.object({
  orgName: z.string().min(2, { message: "O nome da empresa deve ter no mínimo 2 caracteres." }).max(100),
  slug: z.string().min(2, { message: "O identificador deve ter no mínimo 2 caracteres." }).max(50).regex(/^[a-z0-9-]+$/, "Identificador inválido. Use apenas letras minúsculas, números e hífens."),
  adminEmail: z.string().email({ message: "E-mail inválido." }).max(255),
  priceId: z.string().uuid({ message: "Plano inválido." }),
})

export async function selfServiceCheckoutAction(input: {
  orgName: string
  slug: string
  adminEmail: string
  priceId: string
}): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    const planPrice = await getPlanPriceWithPlan(parsed.data.priceId)
    if (!planPrice) return { error: "Plano não encontrado ou indisponível." }
    if (!planPrice.externalPriceId) return { error: "Este plano ainda não está configurado para pagamento. Entre em contato com o suporte." }

    const org = await createOrg({ name: parsed.data.orgName, slug: parsed.data.slug })

    await sendInvite(org.id, parsed.data.adminEmail, "admin")

    const successUrl = `${env.NEXT_PUBLIC_APP_URL}/checkout/success`
    const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/checkout?priceId=${parsed.data.priceId}`

    const checkoutUrl = await createCheckoutSession(org.id, planPrice.externalPriceId, {
      successUrl,
      cancelUrl,
    })

    return { checkoutUrl }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("Este identificador já está em uso")) return { error: "Esse identificador já está em uso. Tente outro." }
    return { error: msg }
  }
}
