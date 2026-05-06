import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/modules/auth/session";
import {
  getHealthSurveyDispatchDashboard,
  getHealthSurveyDispatches,
  getHealthSurveyMultipleDispatchDashboards,
  type HealthSurveyDispatchWithConfig,
} from "@/modules/health-surveys/health-survey-dashboard.service";
import { getOrganization } from "@/modules/organizations/organization.service";
import { formatInTimeZone } from "date-fns-tz"
import { ptBR } from "date-fns/locale";
import {
  Users,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  HealthSurveyQuestionScoreChart,
  HealthSurveyScoreDistributionBar,
  HealthSurveyAdherenceGauge,
  HealthSurveyDeptTrendChart,
  HealthSurveyDispatchComparisonChart,
  type TrendPoint,
  type ComparisonPoint,
} from "@/app/(tenant)/health-surveys/[dispatchId]/components/health-survey-dispatch-charts";
import { HealthSurveyDispatchDeptFilter } from "@/app/(tenant)/health-surveys/[dispatchId]/components/health-survey-dispatch-dept-filter";
import { HealthSurveyDispatchDeptBreakdownTable } from "@/app/(tenant)/health-surveys/[dispatchId]/components/health-survey-dispatch-dept-breakdown-table";
import { adherenceClass } from "@/app/(tenant)/health-surveys/[dispatchId]/components/health-survey-adherence-utils";
import { HealthSurveySignedLinkCopy } from "@/app/(tenant)/health-surveys/[dispatchId]/components/health-survey-signed-link-copy";
import { ChartCard } from "@/components/chart-card";
import type {
  HealthSurveyDispatchDashboardStats,
  ScoreDirection,
} from "@/modules/health-surveys/health-survey.types";
import {
  toHealthIndex,
  healthIndexAccent,
} from "@/libs/utils/health-index";
import { env } from "@/env";

interface HealthSurveyDispatchDetailPageProps {
  params: Promise<{ dispatchId: string }>;
  searchParams: Promise<{ depts?: string | string[] }>;
}

const DAY_FORMAT = "yyyy-MM-dd";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diária",
  twice_weekly: "2x por semana",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground border-border",
  available: "bg-primary/10 text-primary border-primary/20",
  cancelled: "badge-warning",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  available: "Disponível",
  cancelled: "Cancelado",
  failed: "Falhou",
};

interface DeptRankingItem {
  id: string;
  name: string;
  healthIndex: number | null;
  adherence: number;
  responses: number;
  recipients: number;
}

function sortDeptRankingItems(a: DeptRankingItem, b: DeptRankingItem): number {
  if (a.healthIndex === null && b.healthIndex === null) return b.adherence - a.adherence;
  if (a.healthIndex === null) return 1;
  if (b.healthIndex === null) return -1;
  return b.healthIndex - a.healthIndex;
}

interface MergedStatsBase {
  id: string;
  departmentId: string;
  status: string;
  scheduledAt: Date;
  dispatchedAt: Date | null;
  frequency: string;
  departmentName: string;
}

function mergeDispatchStats(
  statsArray: HealthSurveyDispatchDashboardStats[],
  base: MergedStatsBase,
): HealthSurveyDispatchDashboardStats {
  const totalRecipients = statsArray.reduce((s, d) => s + d.totalRecipients, 0);
  const totalResponses = statsArray.reduce((s, d) => s + d.totalResponses, 0);
  const notResponded = Math.max(0, totalRecipients - totalResponses);
  const adherenceRate =
    totalRecipients > 0 ? totalResponses / totalRecipients : 0;

  const questionsByText = new Map<
    string,
    {
      id: string;
      text: string;
      order: number;
      scoreDirection: ScoreDirection;
      distCounts: Map<number, number>;
    }
  >();
  for (const deptStats of statsArray) {
    for (const q of deptStats.questions) {
      const existing = questionsByText.get(q.text);
      if (existing) {
        for (const d of q.distribution) {
          existing.distCounts.set(
            d.score,
            (existing.distCounts.get(d.score) ?? 0) + d.count,
          );
        }
      } else {
        const distCounts = new Map<number, number>();
        for (const d of q.distribution) {
          distCounts.set(d.score, d.count);
        }
        questionsByText.set(q.text, {
          id: q.id,
          text: q.text,
          order: q.order,
          scoreDirection: q.scoreDirection,
          distCounts,
        });
      }
    }
  }

  const questions = Array.from(questionsByText.values())
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      const distribution = [1, 2, 3, 4, 5].map((s) => ({
        score: s,
        count: q.distCounts.get(s) ?? 0,
      }));
      const totalCount = distribution.reduce((s, d) => s + d.count, 0);
      const weightedSum = distribution.reduce((s, d) => {
        const normalized =
          q.scoreDirection === "lower_is_better" ? 6 - d.score : d.score;
        return s + normalized * d.count;
      }, 0);
      const avgScore = totalCount > 0 ? weightedSum / totalCount : null;
      return {
        id: q.id,
        text: q.text,
        order: q.order,
        scoreDirection: q.scoreDirection,
        avgScore,
        distribution,
      };
    });

  const questionAvgs = questions
    .map((q) => q.avgScore)
    .filter((s): s is number => s !== null);
  const avgScore =
    questionAvgs.length > 0
      ? questionAvgs.reduce((a, b) => a + b, 0) / questionAvgs.length
      : null;

  return {
    ...base,
    totalRecipients,
    totalResponses,
    notResponded,
    adherenceRate,
    avgScore,
    signedLinkToken: null,
    questions,
  };
}

function computeMergedLabel(
  selectedIds: string[],
  aggrStats: HealthSurveyDispatchDashboardStats[],
): string {
  if (selectedIds.length === 0) return "Todos os departamentos";
  if (aggrStats.length === 1) {
    const first = aggrStats[0];
    return first?.departmentName ?? "Departamento";
  }
  return `${aggrStats.length} departamentos`;
}

function scoreAccentClass(avg: number | null): string {
  if (avg === null) return "text-muted-foreground";
  return healthIndexAccent(toHealthIndex(avg));
}

interface DeptChartSectionProps {
  deptStats: HealthSurveyDispatchDashboardStats;
}

function DeptChartSection({
  deptStats,
}: DeptChartSectionProps): React.ReactElement {
  const hasResponses = deptStats.totalResponses > 0;
  const deptAdherence = Math.round(deptStats.adherenceRate * 100);

  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold">{deptStats.departmentName}</h2>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>
            {deptStats.totalResponses}/{deptStats.totalRecipients} respostas
          </span>
          <span className={`font-bold ${adherenceClass(deptAdherence)}`}>
            {deptAdherence}% adesão
          </span>
          {deptStats.avgScore !== null && (
            <span
              className={`font-black text-sm font-mono ${scoreAccentClass(deptStats.avgScore)}`}
            >
              {toHealthIndex(deptStats.avgScore)}%{" "}
              <span className="text-[9px] font-normal text-muted-foreground">
                índice de saúde
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="p-5 flex flex-col items-center justify-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Taxa de adesão
          </p>
          <HealthSurveyAdherenceGauge rate={deptStats.adherenceRate} />
          <p className="text-xs text-muted-foreground text-center">
            {deptStats.totalResponses} de {deptStats.totalRecipients}{" "}
            responderam
          </p>
          {deptStats.adherenceRate < 0.5 && deptStats.totalRecipients > 0 && (
            <p className="text-[10px] font-bold text-status-danger uppercase tracking-wider">
              ⚠ Adesão crítica
            </p>
          )}
        </div>

        <div className="md:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Índice de Saúde por Pergunta
            </p>
          </div>
          {hasResponses ? (
            <HealthSurveyQuestionScoreChart stats={deptStats} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhuma resposta registrada ainda.
            </p>
          )}
        </div>
      </div>

      {hasResponses && (
        <div className="border-t border-border">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Distribuição de notas
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[9px] text-muted-foreground">
                Índice de Saúde:
              </span>
              <p
                className={`text-sm font-black ${scoreAccentClass(deptStats.avgScore)}`}
              >
                {deptStats.avgScore !== null
                  ? `${toHealthIndex(deptStats.avgScore)}%`
                  : "—"}
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {deptStats.questions.map((q) => (
              <div
                key={q.id}
                className="px-5 py-4 grid grid-cols-1 md:grid-cols-[260px_1fr_80px] gap-3 items-center"
              >
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-black text-muted-foreground shrink-0 mt-0.5 w-6">
                    P{q.order}
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs text-foreground leading-relaxed">
                      {q.text}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <HealthSurveyScoreDistributionBar question={q} />
                </div>
                <div className="text-right">
                  {q.avgScore !== null ? (
                    <>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                        Índice de Saúde
                      </p>
                      <p
                        className={`text-xl font-black ${scoreAccentClass(q.avgScore)}`}
                      >
                        {toHealthIndex(q.avgScore)}%
                      </p>
                    </>
                  ) : (
                    <p className="text-xl font-black text-muted-foreground">
                      —
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface HistoryBucket {
  dayKey: string;
  scheduledAt: Date;
  totalRecipients: number;
  totalResponses: number;
  dispatchId: string;
}

function buildSameDayPerDept(
  allDispatches: HealthSurveyDispatchWithConfig[],
  anchorDay: string,
  timezone: string,
): Map<string, HealthSurveyDispatchWithConfig> {
  const map = new Map<string, HealthSurveyDispatchWithConfig>();
  for (const d of allDispatches) {
    if (formatInTimeZone(new Date(d.scheduledAt), timezone, DAY_FORMAT) !== anchorDay) continue;
    const deptId = d.healthSurveyConfiguration.departmentId;
    const existing = map.get(deptId);
    if (!existing || new Date(d.scheduledAt) > new Date(existing.scheduledAt)) {
      map.set(deptId, d);
    }
  }
  return map;
}

function buildHistoryBucketMap(
  relevantDispatches: HealthSurveyDispatchWithConfig[],
  timezone: string,
): Map<string, HistoryBucket> {
  const map = new Map<string, HistoryBucket>();
  for (const d of relevantDispatches) {
    const dayKey = formatInTimeZone(new Date(d.scheduledAt), timezone, DAY_FORMAT);
    const existing = map.get(dayKey);
    if (existing !== undefined) {
      existing.totalRecipients += d.totalRecipients;
      existing.totalResponses += d.totalResponses;
    } else {
      map.set(dayKey, {
        dayKey,
        scheduledAt: new Date(d.scheduledAt),
        totalRecipients: d.totalRecipients,
        totalResponses: d.totalResponses,
        dispatchId: d.id,
      });
    }
  }
  return map;
}

async function buildDispatchComparisonData(
  tenantId: string,
  relevantDispatches: HealthSurveyDispatchWithConfig[],
  anchorDayKey: string,
  mergedStats: HealthSurveyDispatchDashboardStats,
  anchorDispatchId: string,
  anchorScheduledAt: Date,
  timezone: string,
): Promise<ComparisonPoint[]> {
  const dayToIds = new Map<string, string[]>();
  for (const d of relevantDispatches) {
    const dayKey = formatInTimeZone(new Date(d.scheduledAt), timezone, DAY_FORMAT);
    const existing = dayToIds.get(dayKey);
    if (existing !== undefined) {
      existing.push(d.id);
    } else {
      dayToIds.set(dayKey, [d.id]);
    }
  }

  const previousDayKeys = [...dayToIds.keys()]
    .filter((k) => k < anchorDayKey)
    .sort()
    .slice(-12);

  const allPreviousIds = previousDayKeys.flatMap((k) => dayToIds.get(k) ?? []);
  const allPreviousStats =
    allPreviousIds.length > 0
      ? await getHealthSurveyMultipleDispatchDashboards(tenantId, allPreviousIds)
      : [];
  const statsById = new Map(allPreviousStats.map((s) => [s.id, s]));

  const previousPoints: ComparisonPoint[] = previousDayKeys
    .map((dayKey) => {
      const ids = dayToIds.get(dayKey) ?? [];
      const dayStats = ids
        .map((id) => statsById.get(id))
        .filter((s): s is HealthSurveyDispatchDashboardStats => s !== undefined);
      if (dayStats.length === 0) return null;
      const firstStat = dayStats[0];
      if (firstStat === undefined) return null;
      const totalRec = dayStats.reduce((s, d) => s + d.totalRecipients, 0);
      const totalRes = dayStats.reduce((s, d) => s + d.totalResponses, 0);
      const adherence = totalRec > 0 ? Math.round((totalRes / totalRec) * 100) : 0;
      const firstDispatch = relevantDispatches.find(
        (d) => formatInTimeZone(new Date(d.scheduledAt), timezone, DAY_FORMAT) === dayKey,
      );
      const base: MergedStatsBase = {
        id: ids[0] ?? "",
        departmentId: firstStat.departmentId,
        status: "available",
        scheduledAt: firstDispatch ? new Date(firstDispatch.scheduledAt) : new Date(),
        dispatchedAt: null,
        frequency: firstStat.frequency,
        departmentName: firstStat.departmentName,
      };
      const dayMerged = mergeDispatchStats(dayStats, base);
      return {
        date: firstDispatch ? formatInTimeZone(new Date(firstDispatch.scheduledAt), timezone, "dd/MM") : dayKey,
        healthIndex: dayMerged.avgScore !== null ? toHealthIndex(dayMerged.avgScore) : null,
        adherence,
        isCurrent: false,
        dispatchId: firstDispatch?.id ?? null,
      };
    })
    .filter((p): p is ComparisonPoint => p !== null);

  return [
    ...previousPoints,
    {
      date: formatInTimeZone(anchorScheduledAt, timezone, "dd/MM"),
      healthIndex: mergedStats.avgScore !== null ? toHealthIndex(mergedStats.avgScore) : null,
      adherence: Math.round(mergedStats.adherenceRate * 100),
      isCurrent: true,
      dispatchId: anchorDispatchId,
    },
  ];
}

export default async function HealthSurveyDispatchDetailPage({
  params,
  searchParams,
}: HealthSurveyDispatchDetailPageProps): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect("/login");

  const { dispatchId } = await params;
  const resolvedSearch = await searchParams;

  const [anchorStats, allDispatches, org] = await Promise.all([
    getHealthSurveyDispatchDashboard(session.tenantId, dispatchId),
    getHealthSurveyDispatches(session.tenantId),
    getOrganization(session.tenantId),
  ]);
  if (!anchorStats) notFound();

  const timezone = org?.timezone ?? "America/Sao_Paulo"

  const anchorDay = formatInTimeZone(anchorStats.scheduledAt, timezone, DAY_FORMAT);

  const sameDayPerDept = buildSameDayPerDept(allDispatches, anchorDay, timezone);

  const allDeptOptions = Array.from(sameDayPerDept.entries()).map(
    ([id, d]) => ({
      id,
      name: d.healthSurveyConfiguration.department.name,
    }),
  );

  const rawDepts = resolvedSearch.depts;
  const selectedIds = (
    Array.isArray(rawDepts)
      ? rawDepts
      : (rawDepts?.split(",").filter(Boolean) ?? [])
  ).filter(Boolean);

  const aggrDispatches =
    selectedIds.length > 0
      ? Array.from(sameDayPerDept.entries())
          .filter(([id]) => selectedIds.includes(id))
          .map(([, d]) => d)
      : Array.from(sameDayPerDept.values());

  const aggrStats = await getHealthSurveyMultipleDispatchDashboards(
    session.tenantId,
    aggrDispatches.map((d) => d.id),
  );

  const mergedLabel = computeMergedLabel(selectedIds, aggrStats);
  const mergedStatsBase: MergedStatsBase = {
    id: anchorStats.id,
    departmentId: anchorStats.departmentId,
    status: anchorStats.status,
    scheduledAt: anchorStats.scheduledAt,
    dispatchedAt: anchorStats.dispatchedAt,
    frequency: anchorStats.frequency,
    departmentName: mergedLabel,
  };
  const mergedStats = mergeDispatchStats(aggrStats, mergedStatsBase);

  const showDeptBreakdown = sameDayPerDept.size > 1;

  const historyDeptName = computeMergedLabel(selectedIds, aggrStats);

  const historyDeptIds =
    selectedIds.length > 0 ? selectedIds : Array.from(sameDayPerDept.keys());
  const relevantDispatches = allDispatches.filter((d: HealthSurveyDispatchWithConfig) =>
    historyDeptIds.includes(d.healthSurveyConfiguration.departmentId),
  );

  const historyBucketMap = buildHistoryBucketMap(relevantDispatches, timezone);

  const allDeptStatsForRanking: HealthSurveyDispatchDashboardStats[] =
    selectedIds.length === 0
      ? aggrStats
      : await getHealthSurveyMultipleDispatchDashboards(
          session.tenantId,
          Array.from(sameDayPerDept.values()).map((d) => d.id),
        );

  const deptRanking = allDeptStatsForRanking
    .map((d) => ({
      id: d.departmentId,
      name: d.departmentName,
      healthIndex: d.avgScore !== null ? toHealthIndex(d.avgScore) : null,
      adherence: Math.round(d.adherenceRate * 100),
      responses: d.totalResponses,
      recipients: d.totalRecipients,
    }))
    .sort(sortDeptRankingItems);

  const deptsQuery =
    selectedIds.length > 0
      ? `?${selectedIds.map((id) => `depts=${id}`).join("&")}`
      : "";

  const sortedBuckets = Array.from(historyBucketMap.values()).sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey),
  );

  const anchorDayKey = formatInTimeZone(new Date(anchorStats.scheduledAt), timezone, DAY_FORMAT);

  const trendData: TrendPoint[] = sortedBuckets.map((b) => ({
    date: formatInTimeZone(b.scheduledAt, timezone, "dd/MM"),
    adherence:
      b.totalRecipients > 0
        ? Math.round((b.totalResponses / b.totalRecipients) * 100)
        : 0,
    dispatchId: b.dayKey,
  }));

  const comparisonData = await buildDispatchComparisonData(
    session.tenantId,
    relevantDispatches,
    anchorDayKey,
    mergedStats,
    dispatchId,
    new Date(anchorStats.scheduledAt),
    timezone,
  );

  const showHealthComparison = comparisonData.length > 1;

  let comparisonTrendDirection: "up" | "down" | null = null;
  const validComparisonPoints = comparisonData.filter((p) => p.healthIndex !== null);
  const comparisonTrendLastTwo = validComparisonPoints.slice(-2);
  if (comparisonTrendLastTwo.length === 2) {
    const prevHi = comparisonTrendLastTwo[0]?.healthIndex ?? 0;
    const currHi = comparisonTrendLastTwo[1]?.healthIndex ?? 0;
    comparisonTrendDirection = currHi >= prevHi ? "up" : "down";
  }

  let comparisonTrendIcon: React.ReactElement = (
    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
  );
  if (comparisonTrendDirection === "up") {
    comparisonTrendIcon = <TrendingUp className="w-3.5 h-3.5 text-status-success" />;
  } else if (comparisonTrendDirection === "down") {
    comparisonTrendIcon = <TrendingDown className="w-3.5 h-3.5 text-status-danger" />;
  }

  return (
    <div className="flex flex-col h-full">
        <div className="border-b border-border bg-card px-6 py-4 shrink-0">
          <Link href="/health-surveys" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Pesquisas</Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold uppercase tracking-widest">
                  Dashboard de Pesquisas
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLE[anchorStats.status] ?? "bg-muted text-muted-foreground border-border"}`}
                >
                  {STATUS_LABELS[anchorStats.status] ?? anchorStats.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {anchorStats.departmentName}
                {" · "}
                {formatInTimeZone(
                  new Date(anchorStats.scheduledAt),
                  timezone,
                  "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                  { locale: ptBR },
                )}
                {" · "}
                {FREQUENCY_LABELS[anchorStats.frequency] ??
                  anchorStats.frequency}
              </p>
            </div>
            {allDeptOptions.length > 1 && (
              <HealthSurveyDispatchDeptFilter departments={allDeptOptions} />
            )}
          </div>
        </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className={`grid gap-0 border border-border bg-card ${mergedStats.avgScore !== null ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
          {mergedStats.avgScore !== null && (
            <div className="px-5 py-4 border-r border-border">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Índice de saúde
                </p>
              </div>
              <p
                className={`text-3xl font-black ${healthIndexAccent(toHealthIndex(mergedStats.avgScore))}`}
              >
                {toHealthIndex(mergedStats.avgScore)}%
              </p>
            </div>
          )}
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Destinatários
              </p>
            </div>
            <p className="text-3xl font-black text-primary">
              {mergedStats.totalRecipients}
            </p>
            {showDeptBreakdown && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {aggrStats.length} departamentos
              </p>
            )}
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Responderam
              </p>
            </div>
            <p className="text-3xl font-black text-status-success">
              {mergedStats.totalResponses}
            </p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-3.5 h-3.5 text-status-danger" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Não responderam
              </p>
            </div>
            <p className="text-3xl font-black text-status-danger">
              {mergedStats.notResponded}
            </p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Taxa de adesão
              </p>
            </div>
            <p
              className={`text-3xl font-black ${adherenceClass(Math.round(mergedStats.adherenceRate * 100))}`}
            >
              {Math.round(mergedStats.adherenceRate * 100)}%
            </p>
          </div>
        </div>

        {showDeptBreakdown && <HealthSurveyDispatchDeptBreakdownTable items={deptRanking} />}

        {anchorStats.signedLinkToken !== null && (
          <HealthSurveySignedLinkCopy
            signedLink={`${env.NEXT_PUBLIC_APP_URL}/health-survey/link/${anchorStats.signedLinkToken}`}
          />
        )}

        <DeptChartSection deptStats={mergedStats} />

        {showHealthComparison && (
          <ChartCard
            title="Evolução do Índice de Saúde"
            subtitle={`Últimas ${comparisonData.length - 1} pesquisa${comparisonData.length - 1 !== 1 ? "s" : ""} comparadas`}
            action={comparisonTrendIcon}
            bodyClassName="px-5 py-4"
          >
            <HealthSurveyDispatchComparisonChart data={comparisonData} />
          </ChartCard>
        )}

        {trendData.length > 0 && (
          <ChartCard
            title={`Histórico de adesão — ${historyDeptName}`}
            subtitle={`${sortedBuckets.length} disparo${sortedBuckets.length !== 1 ? "s" : ""} anteriores`}
            action={
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            }
            bodyClassName="px-5 py-4"
          >
            <HealthSurveyDeptTrendChart data={trendData} currentId={anchorDayKey} />
            <div className="border-t border-border -mx-5 mt-4 divide-y divide-border">
              {[...sortedBuckets]
                .reverse()
                .slice(0, 5)
                .map((b) => {
                  const adh =
                    b.totalRecipients > 0
                      ? Math.round((b.totalResponses / b.totalRecipients) * 100)
                      : 0;
                  const isCurrent = b.dayKey === anchorDayKey;
                  return (
                    <Link
                      key={b.dayKey}
                      href={`/health-surveys/${b.dispatchId}${deptsQuery}`}
                      className={`flex items-center justify-between px-5 py-2.5 text-[11px] hover:bg-muted/30 transition-colors ${isCurrent ? "bg-primary/5" : ""}`}
                    >
                      <span
                        className={`font-mono ${isCurrent ? "font-bold text-primary" : "text-muted-foreground"}`}
                      >
                        {formatInTimeZone(b.scheduledAt, timezone, "dd/MM/yyyy")}
                        {isCurrent && (
                          <span className="ml-2 text-[9px] font-bold uppercase tracking-wider">
                            ← atual
                          </span>
                        )}
                      </span>
                      <span className={`font-bold ${adherenceClass(adh)}`}>
                        {adh}%
                      </span>
                    </Link>
                  );
                })}
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
