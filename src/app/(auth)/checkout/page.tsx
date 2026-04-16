import { redirect } from "next/navigation"
import { getPlanPriceWithPlan } from "@/modules/plans/plan.service"
import { CheckoutForm } from "@/app/(auth)/checkout/checkout-form"

interface CheckoutPageProps {
  searchParams: Promise<{ priceId?: string }>
}

function formatPrice(priceInCents: number, currency: string, interval: string): string {
  const amount = (priceInCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  })
  const intervalLabel = interval === "year" ? "ano" : "mês"
  return `${amount}/${intervalLabel}`
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps): Promise<React.ReactElement> {
  const { priceId } = await searchParams

  if (!priceId) redirect("/")

  const planPrice = await getPlanPriceWithPlan(priceId)

  if (!planPrice) redirect("/")

  const priceLabel = formatPrice(planPrice.priceInCents, planPrice.currency, planPrice.interval)

  return (
    <CheckoutForm
      priceId={priceId}
      planName={planPrice.plan.name}
      priceLabel={priceLabel}
    />
  )
}
