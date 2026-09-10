"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Menu } from "lucide-react"
import { logoutAction } from "@/app/(auth)/logout/actions"
import { useSidebar } from "@/libs/design-system/components/layout/sidebar-context"
import { BADGE_AMBER, BADGE_BASE, BADGE_DEFAULT } from "@/libs/design-system/alert-labels"

interface HeaderProps {
  email: string
  orgName: string
  orgCnpj: string | null
  planName: string | null
  upgradeAvailable: boolean
}

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 14) return value
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

export function Header({ email, orgName, orgCnpj, planName, upgradeAvailable }: HeaderProps): React.ReactElement {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const { setOpen } = useSidebar()

  function handleLogout(): void {
    startTransition(async () => {
      await logoutAction()
      router.push("/login")
    })
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between gap-4 px-4 shrink-0 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="min-[1000px]:hidden p-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          style={{ borderRadius: 0 }}
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{orgName}</p>
          {orgCnpj !== null && (
            <p className="text-[10px] text-muted-foreground truncate hidden md:block tabular-nums">{formatCnpj(orgCnpj)}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3 min-w-0 shrink-0">
        {planName !== null && (
          <span className={`${BADGE_BASE} ${upgradeAvailable ? BADGE_AMBER : BADGE_DEFAULT}`}>
            {planName}
            {upgradeAvailable ? " · Plano superior disponível" : ""}
          </span>
        )}
        <span className="text-xs text-muted-foreground truncate hidden sm:block max-w-[140px] md:max-w-[200px]">{email}</span>
        <div className="w-7 h-7 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-primary">{email.charAt(0).toUpperCase()}</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={pending}
          title="Sair"
          style={{ borderRadius: 0 }}
          className="w-7 h-7 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 shrink-0"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}
