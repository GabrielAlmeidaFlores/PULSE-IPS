"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertCircle, CreditCard } from "lucide-react"

const BILLING_WALL_MESSAGES: Record<string, { title: string; description: string }> = {
  pending: {
    title: "Assinatura necessária",
    description: "Sua organização ainda não possui um plano ativo. Contrate um plano para começar a usar o Pulse.",
  },
  past_due: {
    title: "Pagamento em atraso",
    description: "Há um pagamento pendente na sua assinatura. Regularize para continuar usando o Pulse.",
  },
  suspended: {
    title: "Acesso suspenso",
    description: "Sua assinatura foi suspensa por inadimplência. Regularize o pagamento para reativar o acesso.",
  },
  cancelled: {
    title: "Assinatura cancelada",
    description: "Sua assinatura foi cancelada. Contrate um novo plano para voltar a usar o Pulse.",
  },
}

const BILLING_WALL_DEFAULT = {
  title: "Plano inativo",
  description: "Sua assinatura não está ativa. Contrate ou regularize um plano para continuar.",
}

const BILLING_WALL_EXEMPT_PATHS = new Set(["/billing"])

interface BillingWallModalProps {
  billingStatus: string
}

export function BillingWallModal({ billingStatus }: BillingWallModalProps): React.ReactElement | null {
  const pathname = usePathname()

  if (BILLING_WALL_EXEMPT_PATHS.has(pathname)) return null

  const message = BILLING_WALL_MESSAGES[billingStatus] ?? BILLING_WALL_DEFAULT

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full mx-4 p-8 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">{message.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{message.description}</p>
        </div>

        <Link
          href="/billing"
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors w-full"
        >
          <CreditCard className="w-4 h-4" />
          Gerenciar assinatura
        </Link>
      </div>
    </div>
  )
}
