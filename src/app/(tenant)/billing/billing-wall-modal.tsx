"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTransition } from "react"
import { AlertCircle, CreditCard, LogOut, Loader2 } from "lucide-react"
import { logoutAction } from "@/app/(auth)/logout/actions"

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

const BILLING_WALL_EXEMPT_PATHS = new Set(["/billing", "/settings"])

interface BillingWallModalProps {
  billingStatus: string
  role: "admin" | "rh"
}

function RhBillingWall(): React.ReactElement {
  const [isPending, startTransition] = useTransition()

  function handleLogout(): void {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full mx-4 p-8 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-status-warning-subtle border border-status-warning-border flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-status-warning" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Assinatura com problema</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A assinatura desta organização está inativa ou com pendência. Entre em contato com o administrador da organização para regularizar o acesso.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors w-full disabled:opacity-60"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Sair do sistema
        </button>
      </div>
    </div>
  )
}

export function BillingWallModal({ billingStatus, role }: BillingWallModalProps): React.ReactElement | null {
  const pathname = usePathname()

  if (BILLING_WALL_EXEMPT_PATHS.has(pathname)) return null

  if (role === "rh") return <RhBillingWall />

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
