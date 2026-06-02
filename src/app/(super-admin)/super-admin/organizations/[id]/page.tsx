import { getOrganizationFullDetail, getOrganizationAuditLogs } from "@/modules/organizations/organization.service"
import { buildPaginationParams } from "@/libs/utils/pagination"
import type { OrgFullDetail } from "@/modules/organizations/organization.types"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  MessageSquare,
  BarChart2,
  Activity,
  TrendingUp,
  Zap,
} from "lucide-react"
import { CancelDeletionBanner } from "@/app/(super-admin)/super-admin/organizations/[id]/cancel-deletion-banner"
import { OrgAuditLogs } from "@/app/(super-admin)/super-admin/organizations/[id]/org-audit-logs"
import { SetTrialForm } from "@/app/(super-admin)/super-admin/organizations/[id]/set-trial-form"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

const BILLING_LABELS: Record<string, string> = {
  active: "Ativo",
  trialing: "Em trial",
  pending: "Pendente",
  past_due: "Em atraso",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};
const SUB_STATUS_LABELS: Record<string, string> = {
  trialing: "Período de teste",
  active: "Ativa",
  past_due: "Em atraso",
  unpaid: "Não paga",
  cancelled: "Cancelada",
};
const ROLE_LABELS: Record<string, string> = { admin: "Admin", rh: "RH" };
const INTERVAL_LABELS: Record<string, string> = {
  monthly: "mês",
  annual: "ano",
};

type BadgeColor = "green" | "amber" | "red" | "muted" | "blue";

function billingStatusColor(status: string): BadgeColor {
  if (status === "active") return "green";
  if (status === "trialing") return "blue";
  if (status === "past_due" || status === "suspended") return "red";
  return "amber";
}

function subscriptionStatusColor(status: string): BadgeColor {
  if (status === "active") return "green";
  if (status === "past_due") return "red";
  return "amber";
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

const BADGE_CLS: Record<BadgeColor, string> = {
  green: "badge-success",
  amber: "badge-warning",
  red: "badge-danger",
  blue: "badge-info",
  muted: "bg-muted text-muted-foreground border border-border",
};

function StatusBadge({
  label,
  color,
}: {
  label: string;
  color: BadgeColor;
}): React.ReactElement {
  return (
    <span
      className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 ${BADGE_CLS[color]}`}
      style={{ borderRadius: 2 }}
    >
      {label}
    </span>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={`bg-card border border-border ${className ?? ""}`}
      style={{ borderRadius: 0 }}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon,
  title,
}: {
  icon: React.ReactElement;
  title: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] font-black tracking-widest uppercase text-foreground">
        {title}
      </span>
    </div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0 px-5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

function TopStat({
  icon,
  label,
  value,
  note,
  color,
}: {
  icon: React.ReactElement;
  label: string;
  value: number | string;
  note?: string;
  color: "blue" | "green" | "amber" | "red" | "neutral";
}): React.ReactElement {
  const iconCls = {
    blue: "text-status-info",
    green: "text-status-success",
    amber: "text-status-warning",
    red: "text-status-danger",
    neutral: "text-muted-foreground",
  }[color];
  const valCls = {
    blue: "text-status-info",
    green: "text-status-success",
    amber: "text-status-warning",
    red: "text-status-danger",
    neutral: "text-foreground",
  }[color];
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${iconCls}`}>{icon}</div>
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
            {label}
          </p>
          <p className={`text-3xl font-black leading-none ${valCls}`}>
            {value}
          </p>
          {note !== undefined && (
            <p className="text-[11px] text-muted-foreground mt-1.5">{note}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function SubscriptionCard({
  sub,
}: {
  sub: NonNullable<OrgFullDetail["subscription"]>;
}): React.ReactElement {
  return (
    <>
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
              Plano contratado
            </p>
            <p className="text-[17px] font-black text-foreground leading-tight">
              {sub.snapshotPlanName}
            </p>
            <p className="text-[13px] font-semibold text-status-info mt-0.5">
              {formatBRL(sub.snapshotPriceInCents)}
              <span className="text-[11px] font-normal text-muted-foreground">
                /{INTERVAL_LABELS[sub.snapshotInterval] ?? sub.snapshotInterval}
              </span>
            </p>
          </div>
          <StatusBadge
            label={SUB_STATUS_LABELS[sub.status] ?? sub.status}
            color={subscriptionStatusColor(sub.status)}
          />
        </div>
      </div>
      <div className="px-5 py-3 space-y-0 divide-y divide-border">
        <MetricRow
          label="Período atual"
          value={`${formatDate(sub.currentPeriodStart)} → ${formatDate(sub.currentPeriodEnd)}`}
        />
        <MetricRow
          label="Máx. colaboradores"
          value={sub.snapshotMaxEmployees ?? "Ilimitado"}
        />
        {sub.cancelAtPeriodEnd && (
          <MetricRow
            label="Cancelamento"
            value={<StatusBadge label="Ao fim do período" color="amber" />}
          />
        )}
      </div>
    </>
  );
}

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: Props): Promise<React.ReactElement> {
  const { id } = await params
  const rawParams = await searchParams
  const { page, pageSize } = buildPaginationParams(rawParams["page"], rawParams["pageSize"])

  const [org, auditResult] = await Promise.all([
    getOrganizationFullDetail(id),
    getOrganizationAuditLogs(id, page, pageSize),
  ])

  if (!org) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border bg-card">
          <h1 className="text-[13px] font-black tracking-widest uppercase text-foreground">
            Organização não encontrada
          </h1>
        </div>
      </div>
    );
  }

  const effectiveLimit =
    org.maxEmployeesOverride ?? org.subscription?.snapshotMaxEmployees ?? null;
  const totalEmployees =
    org.employeeCounts.active +
    org.employeeCounts.inactive +
    org.employeeCounts.paused;

  const isInTrial = org.trialExpiresAt !== null && org.trialExpiresAt > new Date()
  const effectiveBillingStatus = isInTrial && org.billingStatus === "pending" ? "trialing" : org.billingStatus

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-3.5 border-b border-border bg-card shrink-0">
        <Link
          href="/super-admin/organizations"
          className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Organizações
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-black tracking-widest uppercase text-foreground truncate">
            {org.name}
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground">
            {org.slug}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge
            label={BILLING_LABELS[effectiveBillingStatus] ?? effectiveBillingStatus}
            color={billingStatusColor(effectiveBillingStatus)}
          />
          <StatusBadge
            label={org.isActive ? "Ativa" : "Inativa"}
            color={org.isActive ? "green" : "muted"}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {org.deletionScheduledAt !== null && (
          <CancelDeletionBanner
            organizationId={org.id}
            deletionScheduledAt={org.deletionScheduledAt}
          />
        )}
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <TopStat
              icon={<Users className="h-5 w-5" />}
              label="Colaboradores ativos"
              value={org.employeeCounts.active}
              note={
                effectiveLimit !== null
                  ? `limite: ${effectiveLimit}`
                  : "sem limite"
              }
              color="blue"
            />
            <TopStat
              icon={<BarChart2 className="h-5 w-5" />}
              label="Pesquisas realizadas"
              value={org.dispatchCount}
              note={`${org.responseCount} respostas recebidas`}
              color="green"
            />
            <TopStat
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Alertas abertos"
              value={org.openAlertCount}
              note={`${org.totalAlertCount} no total`}
              color={org.openAlertCount > 0 ? "red" : "neutral"}
            />
            <TopStat
              icon={<MessageSquare className="h-5 w-5" />}
              label="Mensagens este mês"
              value={org.messagesThisMonth}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader
                  icon={<Building2 className="h-4 w-4" />}
                  title="Dados da organização"
                />
                <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Nome
                    </p>
                    <p className="text-[13px] font-semibold text-foreground">
                      {org.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Slug
                    </p>
                    <p className="text-[13px] font-mono text-foreground">
                      {org.slug}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Fuso horário
                    </p>
                    <p className="text-[13px] font-mono text-foreground">
                      {org.timezone}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Cadastrada em
                    </p>
                    <p className="text-[13px] text-foreground">
                      {formatDate(org.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Colaboradores
                    </p>
                    <p className="text-[13px] text-foreground">
                      <span className="font-black text-status-info">
                        {org.employeeCounts.active}
                      </span>
                      <span className="text-muted-foreground"> ativos · </span>
                      <span className="text-muted-foreground">
                        {org.employeeCounts.inactive} inativos ·{" "}
                        {org.employeeCounts.paused} pausados
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Departamentos
                    </p>
                    <p className="text-[13px] font-semibold text-foreground">
                      {org.departmentCount}
                    </p>
                  </div>
                  {org.externalCustomerId !== null && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                        External Customer ID
                      </p>
                      <p className="text-[12px] font-mono text-muted-foreground">
                        {org.externalCustomerId}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader
                  icon={<Activity className="h-4 w-4" />}
                  title="Resumo de atividade"
                />
                <div className="px-5 py-4 grid grid-cols-3 gap-4">
                  <div className="text-center py-2">
                    <p className="text-2xl font-black text-status-success">
                      {org.dispatchCount}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                      Pesquisas
                    </p>
                  </div>
                  <div className="text-center py-2 border-x border-border">
                    <p
                      className={`text-2xl font-black ${org.openAlertCount > 0 ? "text-status-danger" : "text-foreground"}`}
                    >
                      {org.openAlertCount}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                      Alertas abertos
                    </p>
                  </div>
                  <div className="text-center py-2">
                    <p
                      className={`text-2xl font-black ${org.openReportCount > 0 ? "text-status-warning" : "text-foreground"}`}
                    >
                      {org.openReportCount}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                      Relatos abertos
                    </p>
                  </div>
                </div>
                <div className="border-t border-border divide-y divide-border">
                  <MetricRow
                    label="Respostas de pesquisa recebidas"
                    value={org.responseCount}
                  />
                  <MetricRow
                    label="Planos de ação em aberto"
                    value={`${org.openActionPlanCount} de ${org.actionPlanCount}`}
                  />
                  <MetricRow label="Documentos" value={org.documentCount} />
                  {org.lastPgrReview?.nextReviewAt !== null &&
                    org.lastPgrReview?.nextReviewAt !== undefined && (
                      <MetricRow
                        label="Próxima revisão PGR"
                        value={
                          <span
                            className={
                              new Date(org.lastPgrReview.nextReviewAt) <
                              new Date()
                                ? "text-status-danger font-semibold"
                                : ""
                            }
                          >
                            {formatDate(org.lastPgrReview.nextReviewAt)}
                          </span>
                        }
                      />
                    )}
                </div>
              </Card>

              <Card>
                <CardHeader
                  icon={<Zap className="h-4 w-4" />}
                  title="Atividades"
                />
                <OrgAuditLogs
                  items={auditResult.items}
                  total={auditResult.total}
                  timezone={org.timezone}
                />
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader
                  icon={<CreditCard className="h-4 w-4" />}
                  title="Billing"
                />
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Status
                    </span>
                    <StatusBadge
                      label={
                        BILLING_LABELS[effectiveBillingStatus] ?? effectiveBillingStatus
                      }
                      color={billingStatusColor(effectiveBillingStatus)}
                    />
                  </div>
                </div>
                {org.subscription !== null ? (
                  <SubscriptionCard sub={org.subscription} />
                ) : (
                  <div className="px-5 py-6 text-center">
                    <p className="text-[12px] text-muted-foreground">
                      Sem assinatura ativa
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Plano: {org.plan?.name ?? "Nenhum"}
                    </p>
                  </div>
                )}
                <div className="px-5 py-3 border-t border-border">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
                    Período de trial
                  </p>
                  {org.trialExpiresAt !== null && (
                    <p className="text-[12px] mb-2">
                      <span className={org.trialExpiresAt > new Date() ? "text-status-success font-semibold" : "text-status-danger font-semibold"}>
                        {org.trialExpiresAt > new Date() ? "Ativo até " : "Expirado em "}
                        {formatDate(org.trialExpiresAt)}
                      </span>
                    </p>
                  )}
                  <SetTrialForm organizationId={org.id} trialExpiresAt={org.trialExpiresAt} />
                </div>
              </Card>

              <Card>
                <CardHeader
                  icon={<Users className="h-4 w-4" />}
                  title={`Usuários (${org.users.length})`}
                />
                {org.users.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-[12px] text-muted-foreground">
                      Nenhum usuário ativo
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {org.users.map((u) => (
                      <div
                        key={u.id}
                        className="px-5 py-3.5 flex items-center gap-3"
                      >
                        <div
                          className="h-8 w-8 bg-muted flex items-center justify-center shrink-0 text-[11px] font-black text-muted-foreground uppercase"
                          style={{ borderRadius: 2 }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-foreground truncate">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {u.email}
                          </p>
                        </div>
                        <StatusBadge
                          label={ROLE_LABELS[u.role] ?? u.role}
                          color={u.role === "admin" ? "blue" : "muted"}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader
                  icon={<TrendingUp className="h-4 w-4" />}
                  title="Colaboradores"
                />
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Ativos
                    </span>
                    <span className="text-[15px] font-black text-status-info">
                      {org.employeeCounts.active}
                    </span>
                  </div>
                  {effectiveLimit !== null && (
                    <div
                      className="w-full bg-muted h-1.5"
                      style={{ borderRadius: 1 }}
                    >
                      <div
                        className="bg-status-info h-1.5"
                        style={{
                          borderRadius: 1,
                          width: `${Math.min(100, (org.employeeCounts.active / effectiveLimit) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                  <div className="pt-1 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        Total cadastrados
                      </span>
                      <span className="font-semibold text-foreground">
                        {totalEmployees}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Pausados</span>
                      <span className="font-semibold text-foreground">
                        {org.employeeCounts.paused}
                      </span>
                    </div>
                    {effectiveLimit !== null && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Limite do plano
                        </span>
                        <span className="font-semibold text-foreground">
                          {org.maxEmployeesOverride !== null
                            ? `${org.maxEmployeesOverride} (manual)`
                            : effectiveLimit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
