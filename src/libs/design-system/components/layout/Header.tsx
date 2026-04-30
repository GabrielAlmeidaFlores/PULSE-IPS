"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { logoutAction } from "@/app/(auth)/logout/actions"

interface HeaderProps {
  email: string
}

export function Header({ email }: HeaderProps): React.ReactElement {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleLogout(): void {
    startTransition(async () => {
      await logoutAction()
      router.push("/login")
    })
  }

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 pl-16 md:pl-4 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-status-success" />
        <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Online</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{email}</span>
        <div className="w-7 h-7 bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-[11px] font-bold text-primary">{email.charAt(0).toUpperCase()}</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={pending}
          title="Sair"
          style={{ borderRadius: 0 }}
          className="w-7 h-7 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}
