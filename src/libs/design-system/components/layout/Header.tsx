"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Menu } from "lucide-react"
import { logoutAction } from "@/app/(auth)/logout/actions"
import { useSidebar } from "@/libs/design-system/components/layout/sidebar-context"

interface HeaderProps {
  email: string
}

export function Header({ email }: HeaderProps): React.ReactElement {
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
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 min-w-0">
      <div className="flex items-center gap-3 shrink-0">
        <button
          className="min-[1000px]:hidden p-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          style={{ borderRadius: 0 }}
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-status-success shrink-0" />
          <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Online</span>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
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
