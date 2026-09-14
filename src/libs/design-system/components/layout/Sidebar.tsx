"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  X,
  LayoutDashboard,
  BarChart2,
  Users,
  Building2,
  Bell,
  FileText,
  ShieldCheck,
  CreditCard,
  Settings,
  MessageSquare,
  BookOpen,
  Send,
  ListChecks,
  Percent,
  TrendingUp,
  Gauge,
  Upload,
  Sparkles,
  GitCompareArrows,
  ClipboardList,
} from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Logo } from "@/libs/design-system/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSidebar } from "@/libs/design-system/components/layout/sidebar-context"
import type { PlanFeature } from "@/modules/plans/plan.types"
import { env } from "@/env"

type ModuleKey = "clima" | "people" | "pgr"

interface NavLinkItem {
  href: string
  label: string
  icon: React.ReactElement
  feature?: PlanFeature | undefined
  matchExact?: boolean | undefined
}

interface NavGroup {
  label: string
  items: NavLinkItem[]
}

interface ModuleDefinition {
  key: ModuleKey
  label: string
  href: string
  feature?: PlanFeature | undefined
}

const MODULES: ModuleDefinition[] = [
  { key: "clima", label: "Clima", href: "/climate-surveys", feature: "climate_surveys" },
  { key: "people", label: "Métricas de Equipe", href: "/workforce" },
  { key: "pgr", label: "PGR", href: "/pgr", feature: "pgr" },
]

function getModuleNav(module: ModuleKey, features: PlanFeature[]): NavGroup[] {
  const groups: NavGroup[] = []

  if (module === "clima") {
    groups.push({
      label: "RH / Gestor",
      items: [
        { href: "/climate-surveys", label: "Painel de clima", icon: <BarChart2 className="h-3.5 w-3.5" />, matchExact: true },
        { href: "/climate-surveys/adherence", label: "Adesão", icon: <Percent className="h-3.5 w-3.5" /> },
        { href: "/climate-surveys/configure", label: "Banco de perguntas", icon: <BookOpen className="h-3.5 w-3.5" /> },
        { href: "/climate-surveys/dispatches", label: "Disparo & canais", icon: <Send className="h-3.5 w-3.5" /> },
        { href: "/climate-surveys/compare", label: "Comparar ondas", icon: <GitCompareArrows className="h-3.5 w-3.5" /> },
        { href: "/climate-surveys/reports", label: "Relatórios", icon: <FileText className="h-3.5 w-3.5" /> },
        { href: "/climate-surveys/action-plans", label: "Plano de ação", icon: <ListChecks className="h-3.5 w-3.5" />, feature: "action_plans" },
      ],
    })
  } else if (module === "people") {
    groups.push({
      label: "Métricas de Equipe",
      items: [
        { href: "/workforce", label: "Visão da empresa", icon: <TrendingUp className="h-3.5 w-3.5" />, matchExact: true },
        { href: "/workforce/import", label: "Importar dados", icon: <Upload className="h-3.5 w-3.5" /> },
        { href: "/workforce/insights", label: "Análise com IA", icon: <Sparkles className="h-3.5 w-3.5" /> },
      ],
    })
    groups.push({
      label: "Planos de ação",
      items: [
        { href: "/action-plans", label: "Planos de ação", icon: <ShieldCheck className="h-3.5 w-3.5" />, feature: "action_plans" },
      ],
    })
  } else {
    groups.push({
      label: "PGR",
      items: [{ href: "/pgr", label: "PGR", icon: <ShieldCheck className="h-3.5 w-3.5" />, feature: "pgr" }],
    })
  }

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.feature === undefined || features.includes(item.feature)),
    }))
    .filter((group) => group.items.length > 0)
}

function getGeneralNav(features: PlanFeature[], role: "admin" | "rh"): NavLinkItem[] {
  const items: NavLinkItem[] = [
    { href: "/dashboard", label: "Painel", icon: <LayoutDashboard className="h-4 w-4" />, matchExact: true },
    { href: "/governance", label: "Governança", icon: <Gauge className="h-4 w-4" /> },
    { href: "/employees", label: "Funcionários", icon: <Users className="h-4 w-4" /> },
    { href: "/departments", label: "Departamentos", icon: <Building2 className="h-4 w-4" /> },
    { href: "/health-surveys", label: "Pesquisas de Saúde", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/alerts", label: "Alertas", icon: <Bell className="h-4 w-4" /> },
    { href: "/documents", label: "Documentos", icon: <FileText className="h-4 w-4" />, feature: "documents" },
    { href: "/reports", label: "Relatos", icon: <MessageSquare className="h-4 w-4" />, feature: "anonymous_reports" },
  ]
  const filtered = items.filter((item) => item.feature === undefined || features.includes(item.feature))
  if (role === "admin") {
    filtered.push(
      { href: "/billing", label: "Assinatura", icon: <CreditCard className="h-4 w-4" /> },
      { href: "/settings", label: "Configurações", icon: <Settings className="h-4 w-4" /> },
    )
  }
  return filtered
}

function resolveModule(pathname: string): ModuleKey {
  if (pathname.startsWith("/climate-surveys")) return "clima"
  if (pathname.startsWith("/workforce") || pathname.startsWith("/action-plans")) return "people"
  if (pathname.startsWith("/pgr")) return "pgr"
  return "clima"
}

function isNavLinkActive(pathname: string, item: NavLinkItem): boolean {
  if (item.matchExact === true) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function isClimateDispatchDetail(pathname: string): boolean {
  if (!pathname.startsWith("/climate-surveys/")) return false
  const reserved = ["configure", "dispatches", "action-plans", "adherence", "compare"]
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

function groupLabelClassName(): string {
  return "px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70"
}

function ModuleNavItem({
  item,
  onNavigate,
}: {
  item: NavLinkItem
  onNavigate?: (() => void) | undefined
}): React.ReactElement {
  const pathname = usePathname()
  const active =
    item.href === "/climate-surveys/dispatches"
      ? isNavLinkActive(pathname, item) || isClimateDispatchDetail(pathname)
      : isNavLinkActive(pathname, item)
  return (
    <Link href={item.href} onClick={() => { onNavigate?.() }} className={subLinkClassName(active)}>
      <span className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
      {item.label}
    </Link>
  )
}

function ModuleNav({
  module,
  features,
  onNavigate,
}: {
  module: ModuleKey
  features: PlanFeature[]
  onNavigate?: (() => void) | undefined
}): React.ReactElement {
  const groups = getModuleNav(module, features)

  return (
    <div className="space-y-0.5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className={groupLabelClassName()}>{group.label}</p>
          {group.items.map((item) => (
            <ModuleNavItem key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </div>
  )
}

function SidebarContent({
  role,
  features,
  onNavigate,
}: {
  role: "admin" | "rh"
  features: PlanFeature[]
  onNavigate?: (() => void) | undefined
}): React.ReactElement {
  const pathname = usePathname()
  const activeModule = resolveModule(pathname)
  const visibleModules = MODULES.filter((module) => module.feature === undefined || features.includes(module.feature))
  const generalNav = getGeneralNav(features, role)

  return (
    <nav className="flex-1 px-2 py-3 overflow-y-auto">
      <div className="px-2 pb-3">
        <div className="grid grid-cols-3 gap-1 border border-sidebar-border p-1">
          {visibleModules.map((module) => {
            const isActive = module.key === activeModule
            return (
              <Link
                key={module.key}
                href={module.href}
                onClick={() => { onNavigate?.() }}
                className={`flex items-center justify-center px-1 py-1.5 text-[9px] font-bold uppercase tracking-wider text-center leading-tight transition-colors ${
                  isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {module.label}
              </Link>
            )
          })}
        </div>
      </div>

      <ModuleNav module={activeModule} features={features} onNavigate={onNavigate} />

      <div className="mt-2 border-t border-sidebar-border pt-1">
        <p className={groupLabelClassName()}>Geral</p>
        {generalNav.map((item) => {
          const isActive = isNavLinkActive(pathname, item)
          return (
            <Link key={item.href} href={item.href} onClick={() => { onNavigate?.() }} className={linkClassName(isActive)}>
              <span className={isActive ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>
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
          <SidebarContent
            role={role}
            features={features}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <aside className="hidden lg:flex w-60 flex-col shrink-0 bg-sidebar border-r border-sidebar-border">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
          <Logo size="xs" />
        </div>
        <SidebarContent role={role} features={features} />
        <div className="px-4 py-3 border-t border-sidebar-border flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground/50 font-bold tracking-widest uppercase">v{env.NEXT_PUBLIC_APP_VERSION}</p>
          <ThemeToggle variant="icon" />
        </div>
      </aside>
    </>
  )
}
