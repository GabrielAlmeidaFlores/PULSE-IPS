"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, LayoutDashboard, Users, Building2, ClipboardList, Bell, FileText, ShieldCheck, CreditCard, Settings, MessageSquare } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Logo } from "@/libs/design-system/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import type { PlanFeature } from "@/modules/plans/plan.types"

interface NavItem {
  href: string
  label: string
  icon: React.ReactElement
  feature?: PlanFeature | undefined
}

function getNavItems(role: "admin" | "rh", features: PlanFeature[]): NavItem[] {
  const allItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/employees", label: "Funcionários", icon: <Users className="h-4 w-4" /> },
    { href: "/departments", label: "Departamentos", icon: <Building2 className="h-4 w-4" /> },
    { href: "/surveys", label: "Pesquisas", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/alerts", label: "Alertas", icon: <Bell className="h-4 w-4" /> },
    { href: "/action-plans", label: "Planos de Ação", icon: <ShieldCheck className="h-4 w-4" />, feature: "action_plans" },
    { href: "/documents", label: "Documentos", icon: <FileText className="h-4 w-4" />, feature: "documents" },
    { href: "/reports", label: "Relatos", icon: <MessageSquare className="h-4 w-4" />, feature: "anonymous_reports" },
    { href: "/pgr", label: "PGR", icon: <ShieldCheck className="h-4 w-4" />, feature: "pgr" },
  ]

  const filtered = allItems.filter((item) => item.feature === undefined || features.includes(item.feature))

  if (role === "admin") {
    filtered.push(
      { href: "/billing", label: "Assinatura", icon: <CreditCard className="h-4 w-4" /> },
      { href: "/settings", label: "Configurações", icon: <Settings className="h-4 w-4" /> },
    )
  }
  return filtered
}

interface SidebarProps {
  tenantId: string
  role: "admin" | "rh"
  features: PlanFeature[]
}

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
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${  isActive ? "bg-primary/8 text-primary border-l-[3px] border-primary pl-[calc(0.75rem-3px)]" : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]"}`}
          >
            <span className={isActive ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar({ role, features }: SidebarProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const navItems = getNavItems(role, features)

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
          <p className="text-[10px] text-muted-foreground/50 font-bold tracking-widest uppercase">v0.1.0</p>
          <ThemeToggle variant="icon" />
        </div>
      </aside>
    </>
  )
}
