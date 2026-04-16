import {
  Building2,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  FileText,
  TrendingUp,
  ClipboardList,
  BarChart2,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { KpiBlock } from "@/libs/design-system/components/data-display/KpiBlock";
import { ExportButton } from "@/app/(super-admin)/super-admin/dashboard/export-button";
import { getPlatformMetrics } from "@/modules/platform-metrics/platform-metrics.service";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function BillingBadge({ status }: { status: string }): React.ReactElement {
  const map: Record<string, string> = {
    active: "admin-bg-green admin-accent-green",
    pending: "admin-bg-amber admin-accent-amber",
    canceled: "admin-bg-red admin-accent-red",
    inactive: "bg-muted text-muted-foreground",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 ${cls}`}
      style={{ borderRadius: 0 }}
    >
      {status}
    </span>
  );
}

function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-black tracking-[0.25em] uppercase text-muted-foreground">
        {children}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default async function SuperAdminDashboardPage(): Promise<React.ReactElement> {
  const m = await getPlatformMetrics();

  const conversionRate =
    m.totalOrganizations > 0
      ? Math.round((m.activeSubscriptions / m.totalOrganizations) * 100)
      : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-foreground">
            Platform Dashboard
          </h1>
          <p className="text-[11px] text-muted-foreground tracking-wide">
            Visão operacional em tempo real
          </p>
        </div>
        <div className="flex items-center gap-0">
          <Link
            href="/super-admin/organizations"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase border border-primary hover:bg-primary/90 transition-colors"
            style={{ borderRadius: 0 }}
          >
            <Building2 className="h-3.5 w-3.5" />
            Organizações
          </Link>
          <Link
            href="/super-admin/plans"
            className="flex items-center gap-2 px-4 py-2 bg-card text-foreground text-[11px] font-bold tracking-widest uppercase border border-border hover:bg-muted transition-colors"
            style={{ borderRadius: 0 }}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Planos
          </Link>
          <ExportButton />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <SectionLabel>Métricas Principais</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-border">
            <KpiBlock
              label="Receita Mensal"
              value={formatBRL(m.monthlyRevenueCents)}
              sub={`${m.activeSubscriptions} assinaturas ativas`}
              accent="green"
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiBlock
              label="Orgs Ativas"
              value={m.activeOrganizations}
              sub={`${m.totalOrganizations} total`}
              accent="blue"
              icon={<Building2 className="h-4 w-4" />}
              trend={{ value: m.newOrgsThisMonth, label: "este mês" }}
            />
            <KpiBlock
              label="Colaboradores"
              value={m.totalEmployees.toLocaleString("pt-BR")}
              sub="com status ativo"
              accent="blue"
              icon={<Users className="h-4 w-4" />}
            />
            <KpiBlock
              label="Pesquisas"
              value={m.totalResponses.toLocaleString("pt-BR")}
              sub="respostas coletadas"
              accent="neutral"
              icon={<Activity className="h-4 w-4" />}
            />
            <KpiBlock
              label="Alertas Gerados"
              value={m.totalAlerts.toLocaleString("pt-BR")}
              sub="histórico total"
              accent="amber"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <KpiBlock
              label="Conversão"
              value={`${conversionRate}%`}
              sub={`${m.openActionPlans} planos de ação abertos`}
              accent={conversionRate >= 50 ? "green" : "red"}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8">
            <SectionLabel>Organizações — Últimas 10</SectionLabel>
            <div className="border border-border bg-card">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">
                      Organização
                    </th>
                    <th className="text-left px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">
                      Plano
                    </th>
                    <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">
                      Colaboradores
                    </th>
                    <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">
                      MRR
                    </th>
                    <th className="text-center px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">
                      Billing
                    </th>
                    <th className="text-right px-4 py-2.5 font-bold tracking-widest uppercase text-[10px] text-muted-foreground">
                      Criado em
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {m.recentOrganizations.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground text-[11px] tracking-wide"
                      >
                        Nenhuma organização cadastrada.
                      </td>
                    </tr>
                  )}
                  {m.recentOrganizations.map((org, i) => (
                    <tr
                      key={org.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-foreground">
                          {org.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {org.slug}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {org.planName ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {org.employeeCount}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono admin-accent-green">
                        {org.priceInCents ? formatBRL(org.priceInCents) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <BillingBadge status={org.billingStatus} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {formatDate(org.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Exibindo as 10 mais recentes de {m.totalOrganizations} total
                </span>
                <Link
                  href="/super-admin/organizations"
                  className="text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/80"
                >
                  Ver todas →
                </Link>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 space-y-4">
            <div>
              <SectionLabel>Status Operacional</SectionLabel>
              <div className="border border-border bg-card divide-y divide-border">
                <StatusRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="Orgs novas este mês"
                  value={String(m.newOrgsThisMonth)}
                  accent="blue"
                />
                <StatusRow
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Planos de ação abertos"
                  value={String(m.openActionPlans)}
                  accent={m.openActionPlans > 10 ? "amber" : "neutral"}
                />
                <StatusRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Documentos gerados"
                  value={m.totalDocuments.toLocaleString("pt-BR")}
                  accent="neutral"
                />
                <StatusRow
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Taxa de conversão"
                  value={`${conversionRate}%`}
                  accent={conversionRate >= 50 ? "green" : "red"}
                />
              </div>
            </div>

            <div>
              <SectionLabel>Distribuição de Billing</SectionLabel>
              <div className="border border-border bg-card p-4 space-y-3">
                <BillingBar
                  label="Ativas"
                  count={m.activeSubscriptions}
                  total={m.totalOrganizations}
                  accent="green"
                />
                <BillingBar
                  label="Pendentes"
                  count={
                    m.totalOrganizations -
                    m.activeSubscriptions -
                    Math.max(
                      0,
                      m.totalOrganizations -
                        m.activeOrganizations -
                        (m.totalOrganizations - m.activeSubscriptions),
                    )
                  }
                  total={m.totalOrganizations}
                  accent="amber"
                />
                <BillingBar
                  label="Inativas"
                  count={m.totalOrganizations - m.activeOrganizations}
                  total={m.totalOrganizations}
                  accent="red"
                />
              </div>
            </div>

            <div>
              <SectionLabel>Atalhos Rápidos</SectionLabel>
              <div className="border border-border bg-card divide-y divide-border">
                <QuickLink
                  href="/super-admin/organizations"
                  label="→ Ver organizações"
                />
                <QuickLink
                  href="/super-admin/plans/new"
                  label="+ Criar plano"
                />
                <QuickLink
                  href="/super-admin/plans"
                  label="→ Gerenciar planos"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>Indicadores de Saúde da Plataforma</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            <HealthCard
              icon={<ShieldAlert className="h-5 w-5" />}
              label="Alertas / Org"
              value={
                m.totalOrganizations > 0
                  ? (m.totalAlerts / m.totalOrganizations).toFixed(1)
                  : "0.0"
              }
              note="média por organização"
            />
            <HealthCard
              icon={<Users className="h-5 w-5" />}
              label="Colaboradores / Org"
              value={
                m.activeOrganizations > 0
                  ? Math.round(
                      m.totalEmployees / m.activeOrganizations,
                    ).toString()
                  : "0"
              }
              note="média por org ativa"
            />
            <HealthCard
              icon={<Activity className="h-5 w-5" />}
              label="Pesquisas / Colaborador"
              value={
                m.totalEmployees > 0
                  ? (m.totalResponses / m.totalEmployees).toFixed(1)
                  : "0.0"
              }
              note="índice de engajamento"
            />
            <HealthCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Receita / Org Ativa"
              value={
                m.activeOrganizations > 0
                  ? formatBRL(
                      Math.round(m.monthlyRevenueCents / m.activeOrganizations),
                    )
                  : "R$ 0"
              }
              note="MRR médio por cliente"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
  accent: "blue" | "green" | "amber" | "red" | "neutral";
}): React.ReactElement {
  const colorMap: Record<string, string> = {
    blue: "admin-accent-blue",
    green: "admin-accent-green",
    amber: "admin-accent-amber",
    red: "admin-accent-red",
    neutral: "text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-[12px] text-foreground flex-1">{label}</span>
      <span className={`text-[13px] font-bold font-mono ${colorMap[accent]}`}>
        {value}
      </span>
    </div>
  );
}

function BillingBar({
  label,
  count,
  total,
  accent,
}: {
  label: string;
  count: number;
  total: number;
  accent: "green" | "amber" | "red";
}): React.ReactElement {
  const pct = total > 0 ? Math.max(0, Math.min(100, (count / total) * 100)) : 0;
  const barColor: Record<string, string> = {
    green: "bg-[oklch(0.68_0.20_160)]",
    amber: "bg-[oklch(0.72_0.18_75)]",
    red: "bg-[oklch(0.62_0.22_25)]",
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-semibold uppercase tracking-widest">
          {label}
        </span>
        <span className="font-mono font-bold text-foreground">{count}</span>
      </div>
      <div className="h-1.5 bg-muted w-full" style={{ borderRadius: 0 }}>
        <div
          className={`h-full ${barColor[accent]}`}
          style={{ width: `${pct}%`, borderRadius: 0 }}
        />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  label,
}: {
  href: string;
  label: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="flex items-center px-4 py-2.5 text-[12px] font-semibold text-muted-foreground hover:text-primary hover:bg-muted/40 transition-colors"
      style={{ borderRadius: 0 }}
    >
      {label}
    </Link>
  );
}

function HealthCard({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
  note: string;
}): React.ReactElement {
  return (
    <div className="bg-card p-4 flex items-center gap-4">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
          {label}
        </p>
        <p className="text-xl font-black text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{note}</p>
      </div>
    </div>
  );
}
