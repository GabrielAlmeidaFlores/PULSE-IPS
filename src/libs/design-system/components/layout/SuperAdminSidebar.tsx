"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, LayoutDashboard, Building2, CreditCard, FileText, Users, ScrollText, Cpu } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Logo } from "@/libs/design-system/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"

interface NavItem {
  href: string
  label: string
  icon: React.ReactElement
}

const navItems: NavItem[] = [
  { href: "/super-admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/super-admin/organizations", label: "Organizações", icon: <Building2 className="h-4 w-4" /> },
  { href: "/super-admin/plans", label: "Planos", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/super-admin/terms", label: "Documentos Legais", icon: <FileText className="h-4 w-4" /> },
  { href: "/super-admin/admins", label: "Admins", icon: <Users className="h-4 w-4" /> },
  { href: "/super-admin/logs", label: "Logs HTTP", icon: <ScrollText className="h-4 w-4" /> },
  { href: "/super-admin/jobs", label: "Workers", icon: <Cpu className="h-4 w-4" /> },
]

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }): React.ReactElement {
  const pathname = usePathname()
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => { onNavigate?.() }}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${isActive ? "bg-primary/8 text-primary border-l-[3px] border-primary pl-[calc(0.75rem-3px)]" : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]"}`}
          >
            <span className={isActive ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function SuperAdminSidebar(): React.ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-40 p-2 border border-border bg-card text-foreground hover:bg-muted transition-colors"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 p-0 bg-sidebar border-sidebar-border" style={{ borderRadius: 0 }}>
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
            <Logo size="sm" />
            <button onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <NavLinks items={navItems} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="hidden md:flex w-60 flex-col shrink-0 bg-sidebar border-r border-sidebar-border">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
          <Logo size="sm" />
        </div>
        <NavLinks items={navItems} />
        <div className="px-4 py-3 border-t border-sidebar-border flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground/50 font-bold tracking-widest uppercase">v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
          <ThemeToggle variant="icon" />
        </div>
      </aside>
    </>
  )
}


