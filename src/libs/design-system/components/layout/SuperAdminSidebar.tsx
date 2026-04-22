"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, LayoutDashboard, Building2, CreditCard, FileText, LogOut, Users, ScrollText } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { superAdminLogoutAction } from "@/app/(super-admin-public)/super-admin/logout/actions"

interface NavItem {
  href: string
  label: string
  icon: React.ReactElement
}

const navItems: NavItem[] = [
  { href: "/super-admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/super-admin/organizations", label: "Organizações", icon: <Building2 className="h-4 w-4" /> },
  { href: "/super-admin/plans", label: "Planos", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/super-admin/terms", label: "Termos de Uso", icon: <FileText className="h-4 w-4" /> },
  { href: "/super-admin/admins", label: "Admins", icon: <Users className="h-4 w-4" /> },
  { href: "/super-admin/logs", label: "Logs", icon: <ScrollText className="h-4 w-4" /> },
]

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: (() => void) | undefined }): React.ReactElement {
  const pathname = usePathname()
  return (
    <nav className="flex-1 py-2">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => { onNavigate?.() }}
            className={`flex items-center gap-3 px-5 py-3 text-[13px] font-semibold tracking-wide uppercase transition-colors border-l-2 ${
              isActive
                ? "border-l-primary bg-primary/10 text-primary"
                : "border-l-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground"
            }`}
            style={{ borderRadius: 0 }}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: (() => void) | undefined }): React.ReactElement {
  const [pending, startTransition] = useTransition()

  function handleLogout(): void {
    startTransition(async () => {
      await superAdminLogoutAction()
    })
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border shrink-0">
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-black tracking-widest uppercase text-foreground">PULSE</span>
          <span className="text-[9px] font-semibold tracking-[0.25em] uppercase text-primary">ADMIN CONSOLE</span>
        </div>
      </div>

      <div className="px-5 pt-4 pb-1">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Navegação</span>
      </div>

      <NavLinks items={navItems} onNavigate={onNavigate} />

      <div className="mt-auto border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          disabled={pending}
          style={{ borderRadius: 0 }}
          className="w-full flex items-center gap-3 px-5 py-3 text-[12px] font-semibold tracking-wide uppercase text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
        >
          <LogOut className="h-4 w-4" />
          {pending ? "Saindo..." : "Sair"}
        </button>
      </div>
    </div>
  )
}

export function SuperAdminSidebar(): React.ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-40 bg-card border border-border p-2 text-foreground"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        style={{ borderRadius: 0 }}
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 p-0 border-r border-border">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
              style={{ borderRadius: 0 }}
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="hidden md:flex w-56 border-r border-sidebar-border flex-col shrink-0 bg-sidebar">
        <SidebarContent />
      </aside>
    </>
  )
}


