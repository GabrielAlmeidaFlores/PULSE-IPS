"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  X,
  LayoutDashboard,
  BarChart2,
  Users,
  Building2,
  ClipboardList,
  Bell,
  FileText,
  ShieldCheck,
  CreditCard,
  Settings,
  MessageSquare,
  Thermometer,
  ChevronDown,
  BookOpen,
  Send,
  ListChecks,
  Percent,
  TrendingUp,
} from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Logo } from "@/libs/design-system/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSidebar } from "@/libs/design-system/components/layout/sidebar-context"
import type { PlanFeature } from "@/modules/plans/plan.types"
import { env } from "@/env"

interface NavLinkItem {
  href: string
  label: string
  icon: React.ReactElement
  feature?: PlanFeature | undefined
  matchExact?: boolean | undefined
}

interface NavSectionItem {
  kind: "section"
  id: string
  label: string
  icon: React.ReactElement
  feature?: PlanFeature | undefined
  basePath: string
  children: NavLinkItem[]
}

interface NavFlatItem extends NavLinkItem {
  kind: "link"
}

type NavEntry = NavFlatItem | NavSectionItem

function getNavEntries(role: "admin" | "rh", features: PlanFeature[]): NavEntry[] {
  const climateChildren: NavLinkItem[] = [
    { href: "/climate-surveys", label: "Board", icon: <BarChart2 className="h-3.5 w-3.5" />, matchExact: true },
    { href: "/climate-surveys/adherence", label: "Adesão", icon: <Percent className="h-3.5 w-3.5" /> },
    { href: "/climate-surveys/configure", label: "Banco de Perguntas", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { href: "/climate-surveys/dispatches", label: "Disparo & Canais", icon: <Send className="h-3.5 w-3.5" /> },
    { href: "/climate-surveys/action-plans", label: "Plano de Ação", icon: <ListChecks className="h-3.5 w-3.5" />, feature: "action_plans" },
  ]

  const allEntries: NavEntry[] = [
    { kind: "link", href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { kind: "link", href: "/employees", label: "Funcionários", icon: <Users className="h-4 w-4" /> },
    { kind: "link", href: "/departments", label: "Departamentos", icon: <Building2 className="h-4 w-4" /> },
    { kind: "link", href: "/health-surveys", label: "Pesquisas", icon: <ClipboardList className="h-4 w-4" /> },
    { kind: "link", href: "/workforce", label: "Indicadores de Pessoas", icon: <TrendingUp className="h-4 w-4" /> },
    {
      kind: "section",
      id: "climate-surveys",
      label: "Pesquisa de Clima",
      icon: <Thermometer className="h-4 w-4" />,
      feature: "climate_surveys",
      basePath: "/climate-surveys",
      children: climateChildren,
    },
    { kind: "link", href: "/alerts", label: "Alertas", icon: <Bell className="h-4 w-4" /> },
    { kind: "link", href: "/action-plans", label: "Planos de Ação", icon: <ShieldCheck className="h-4 w-4" />, feature: "action_plans" },
    { kind: "link", href: "/documents", label: "Documentos", icon: <FileText className="h-4 w-4" />, feature: "documents" },
    { kind: "link", href: "/reports", label: "Relatos", icon: <MessageSquare className="h-4 w-4" />, feature: "anonymous_reports" },
    { kind: "link", href: "/pgr", label: "PGR", icon: <ShieldCheck className="h-4 w-4" />, feature: "pgr" },
  ]

  const filtered = allEntries.filter((entry) => entry.feature === undefined || features.includes(entry.feature))
    .map((entry) => {
      if (entry.kind !== "section") return entry
      return {
        ...entry,
        children: entry.children.filter((child) => child.feature === undefined || features.includes(child.feature)),
      }
    })

  if (role === "admin") {
    filtered.push(
      { kind: "link", href: "/billing", label: "Assinatura", icon: <CreditCard className="h-4 w-4" /> },
      { kind: "link", href: "/settings", label: "Configurações", icon: <Settings className="h-4 w-4" /> },
    )
  }
  return filtered
}

function isNavLinkActive(pathname: string, item: NavLinkItem): boolean {
  if (item.matchExact === true) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function isClimateDispatchDetail(pathname: string): boolean {
  if (!pathname.startsWith("/climate-surveys/")) return false
  const reserved = ["configure", "dispatches", "action-plans", "adherence"]
  const segment = pathname.split("/")[2]
  return segment !== undefined && !reserved.includes(segment)
}

function linkClassName(isActive: boolean): string {
  return `flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
    isActive
      ? "bg-primary/8 text-primary border-l-[3px] border-primary pl-[calc(0.75rem-3px)]"
      : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]"
  }`
}

function subLinkClassName(isActive: boolean): string {
  return `flex items-center gap-2.5 pl-9 pr-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${
    isActive
      ? "bg-primary/8 text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  }`
}

function ClimateSurveySectionNav({
  section,
  onNavigate,
}: {
  section: NavSectionItem
  onNavigate?: (() => void) | undefined
}): React.ReactElement {
  const pathname = usePathname()
  const sectionActive = pathname.startsWith(section.basePath)
  const [expanded, setExpanded] = useState(sectionActive)

  const isOpen = expanded || sectionActive

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => { setExpanded((prev) => !prev) }}
        className={`w-full ${linkClassName(sectionActive)}`}
        aria-expanded={isOpen}
      >
        <span className={sectionActive ? "text-primary" : "text-muted-foreground"}>{section.icon}</span>
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="space-y-0.5">
          {section.children.map((child) => {
            const childActive =
              child.href === "/climate-surveys/dispatches"
                ? isNavLinkActive(pathname, child) || isClimateDispatchDetail(pathname)
                : isNavLinkActive(pathname, child)
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => { onNavigate?.() }}
                className={subLinkClassName(childActive)}
              >
                <span className={childActive ? "text-primary" : "text-muted-foreground"}>{child.icon}</span>
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NavLinks({ entries, onNavigate }: { entries: NavEntry[]; onNavigate?: () => void }): React.ReactElement {
  const pathname = usePathname()
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {entries.map((entry) => {
        if (entry.kind === "section") {
          return <ClimateSurveySectionNav key={entry.id} section={entry} onNavigate={onNavigate} />
        }
        const isActive = isNavLinkActive(pathname, entry)
        return (
          <Link
            key={entry.href}
            href={entry.href}
            onClick={() => { onNavigate?.() }}
            className={linkClassName(isActive)}
          >
            <span className={isActive ? "text-primary" : "text-muted-foreground"}>{entry.icon}</span>
            {entry.label}
          </Link>
        )
      })}
    </nav>
  )
}

interface SidebarProps {
  tenantId: string
  role: "admin" | "rh"
  features: PlanFeature[]
}

export function Sidebar({ role, features }: SidebarProps): React.ReactElement {
  const { open, setOpen } = useSidebar()
  const navEntries = getNavEntries(role, features)

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 p-0 bg-sidebar border-sidebar-border" style={{ borderRadius: 0 }}>
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
            <Logo size="xs" />
            <button onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <NavLinks entries={navEntries} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="hidden min-[1000px]:flex w-60 flex-col shrink-0 bg-sidebar border-r border-sidebar-border">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
          <Logo size="xs" />
        </div>
        <NavLinks entries={navEntries} />
        <div className="px-4 py-3 border-t border-sidebar-border flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground/50 font-bold tracking-widest uppercase">v{env.NEXT_PUBLIC_APP_VERSION}</p>
          <ThemeToggle variant="icon" />
        </div>
      </aside>
    </>
  )
}
