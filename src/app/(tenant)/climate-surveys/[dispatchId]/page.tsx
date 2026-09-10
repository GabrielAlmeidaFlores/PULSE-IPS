import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/modules/auth/session";
import { hasTenantPlanFeature } from "@/modules/billing/billing.service";
import {
  getClimateSurveyDispatchDashboard,
  getClimateSurveyDispatches,
  getClimateSurveyMultipleDispatchDashboards,
  getClimateSurveyOpenComments,
  type ClimateSurveyDispatchWithConfig,
} from "@/modules/climate-surveys/climate-survey-dashboard.service";
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
  ClimateSurveyQuestionScoreChart,
  ClimateSurveyScoreDistributionBar,
  ClimateSurveyAdherenceGauge,
  ClimateSurveyDeptTrendChart,
  ClimateSurveyDispatchComparisonChart,
  type TrendPoint,
  type ComparisonPoint,
} from "@/app/(tenant)/climate-surveys/[dispatchId]/components/climate-survey-dispatch-charts";
import { ClimateSurveyDispatchDeptFilter } from "@/app/(tenant)/climate-surveys/[dispatchId]/components/climate-survey-dispatch-dept-filter";
import { ClimateSurveyDispatchDeptBreakdownTable } from "@/app/(tenant)/climate-surveys/[dispatchId]/components/climate-survey-dispatch-dept-breakdown-table";
import { adherenceClass } from "@/app/(tenant)/climate-surveys/[dispatchId]/components/climate-survey-adherence-utils";
import { ClimateSurveySignedLinkCopy } from "@/app/(tenant)/climate-surveys/[dispatchId]/components/climate-survey-signed-link-copy";
import { CreateClimateSurveyActionPlanButton } from "@/app/(tenant)/climate-surveys/[dispatchId]/components/create-climate-survey-action-plan-button";
import { ChartCard } from "@/components/chart-card";
import {
  resolveClimateSurveyTopicLabel,
  toClimateSurveyDimension,
  type ClimateSurveyDimension,
  type ClimateSurveyDispatchDashboardStats,
  type ClimateSurveyEnpsBreakdown,
  type ScoreDirection,
} from "@/modules/climate-surveys/climate-survey.types";
import {
  computeClimateSurveyEnpsFromNormalizedScores,
  computeClimateSurveyFavorabilityPercent,
  computeClimateSurveyWeightedScorePercent,
  normalizeClimateSurveyLikertScore,
} from "@/modules/climate-surveys/climate-survey-metrics";
import {
  healthIndexAccent,
} from "@/libs/utils/health-index";
import { CLIMATE_SURVEY_MIN_RESPONDENTS_FLOOR, climateSurveyRequiredRespondents } from "@/libs/utils/anonymity";
import { BADGE_AMBER, BADGE_BASE, BADGE_DEFAULT, BADGE_GREEN, BADGE_RED } from "@/libs/design-system/alert-labels";
import { env } from "@/env";

interface ClimateSurveyDispatchDetailPageProps {
  params: Promise<{ dispatchId: string }>;
  searchParams: Promise<{ depts?: string | string[] }>;
}

const DAY_FORMAT = "yyyy-MM-dd";

const FREQUENCY_LABELS: Record<string, string> = {
  once: "Pesquisa única",
  daily: "Diária",
  twice_weekly: "2x por semana",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
};

const STATUS_STYLE: Record<string, string> = {
  scheduled: BADGE_DEFAULT,
  available: BADGE_GREEN,
  cancelled: BADGE_AMBER,
  failed: BADGE_RED,
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
  configName: string;
  departments: { id: string; name: string }[];
  status: string;
  scheduledAt: Date;
  dispatchedAt: Date | null;
  frequency: string;
  minRespondentsPercent: number;
}

interface MergedQuestionAccumulator {
  id: string;
  text: string;
  order: number;
  scoreDirection: ScoreDirection;
  dimension: ClimateSurveyDimension;
  distCounts: Map<number, number>;
}

function accumulateMergedQuestions(
  statsArray: ClimateSurveyDispatchDashboardStats[],
): Map<string, MergedQuestionAccumulator> {
  const questionsByText = new Map<string, MergedQuestionAccumulator>();
  for (const deptStats of statsArray) {
    for (const q of deptStats.questions) {
      const existing = questionsByText.get(q.text);
      if (existing) {
        for (const d of q.distribution) {
          existing.distCounts.set(d.score, (existing.distCounts.get(d.score) ?? 0) + d.count);
        }
        continue;
      }
      const distCounts = new Map<number, number>();
      for (const d of q.distribution) {
        distCounts.set(d.score, d.count);
      }
      questionsByText.set(q.text, {
        id: q.id,
        text: q.text,
        order: q.order,
        scoreDirection: q.scoreDirection,
        dimension: toClimateSurveyDimension(q.dimension),
        distCounts,
      });
    }
  }
  return questionsByText;
}

function expandNormalizedScoresFromDistribution(
  scoreDirection: ScoreDirection,
  distribution: { score: number; count: number }[],
): number[] {
  const scores: number[] = [];
  for (const bucket of distribution) {
    const normalized = normalizeClimateSurveyLikertScore(bucket.score, scoreDirection);
    for (let index = 0; index < bucket.count; index += 1) {
      scores.push(normalized);
    }
  }
  return scores;
}

function metricsFromNormalizedScores(normalizedScores: number[]): {
  avgScore: number | null;
  favorabilityPercent: number | null;
  weightedScorePercent: number | null;
  enps: number | null;
  enpsBreakdown: ClimateSurveyEnpsBreakdown;
} {
  const enpsBreakdown = computeClimateSurveyEnpsFromNormalizedScores(normalizedScores);
  return {
    avgScore:
      normalizedScores.length > 0
        ? normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length
        : null,
    favorabilityPercent: computeClimateSurveyFavorabilityPercent(normalizedScores),
    weightedScorePercent: computeClimateSurveyWeightedScorePercent(normalizedScores),
    enps: enpsBreakdown.score,
    enpsBreakdown,
  };
}

function finalizeMergedQuestions(
  questionsByText: Map<string, MergedQuestionAccumulator>,
): ClimateSurveyDispatchDashboardStats["questions"] {
  return Array.from(questionsByText.values())
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      const distribution = [1, 2, 3, 4, 5].map((s) => ({
        score: s,
        count: q.distCounts.get(s) ?? 0,
      }));
      const metrics = metricsFromNormalizedScores(
        expandNormalizedScoresFromDistribution(q.scoreDirection, distribution),
      );
      return {
        id: q.id,
        text: q.text,
        order: q.order,
        scoreDirection: q.scoreDirection,
        dimension: q.dimension,
        avgScore: metrics.avgScore,
        favorabilityPercent: metrics.favorabilityPercent,
        weightedScorePercent: metrics.weightedScorePercent,
        enps: metrics.enps,
        distribution,
      };
    });
}

function buildMergedDimensionScores(
  questions: ClimateSurveyDispatchDashboardStats["questions"],
  statsArray: ClimateSurveyDispatchDashboardStats[],
): ClimateSurveyDispatchDashboardStats["dimensionScores"] {
  const labelByDimension = new Map<string, string>();
  for (const stats of statsArray) {
    for (const dimensionScore of stats.dimensionScores) {
      if (!labelByDimension.has(dimensionScore.dimension)) {
        labelByDimension.set(dimensionScore.dimension, dimensionScore.label);
      }
    }
  }
  const byDimension = new Map<
    ClimateSurveyDimension,
    { scores: number[]; favorability: number[]; weighted: number[]; enps: number[]; questionCount: number }
  >();
  for (const question of questions) {
    const current = byDimension.get(question.dimension) ?? {
      scores: [],
      favorability: [],
      weighted: [],
      enps: [],
      questionCount: 0,
    };
    if (question.avgScore !== null) current.scores.push(question.avgScore);
    if (question.favorabilityPercent !== null) current.favorability.push(question.favorabilityPercent);
    if (question.weightedScorePercent !== null) current.weighted.push(question.weightedScorePercent);
    if (question.enps !== null) current.enps.push(question.enps);
    current.questionCount += 1;
    byDimension.set(question.dimension, current);
  }
  return Array.from(byDimension.entries()).map(([dimension, data]) => ({
    dimension,
    label: labelByDimension.get(dimension) ?? resolveClimateSurveyTopicLabel(dimension),
    avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : null,
    favorabilityPercent:
      data.favorability.length > 0
        ? Math.round(data.favorability.reduce((a, b) => a + b, 0) / data.favorability.length)
        : null,
    weightedScorePercent:
      data.weighted.length > 0
        ? Math.round(data.weighted.reduce((a, b) => a + b, 0) / data.weighted.length)
        : null,
    enps: data.enps.length > 0 ? Math.round(data.enps.reduce((a, b) => a + b, 0) / data.enps.length) : null,
    questionCount: data.questionCount,
  }));
}

function mergeDepartmentScores(
  statsArray: ClimateSurveyDispatchDashboardStats[],
): ClimateSurveyDispatchDashboardStats["departmentScores"] {
  const byDepartment = new Map<
    string,
    {
      departmentId: string;
      departmentName: string;
      favorability: number[];
      weighted: number[];
      enps: number[];
      answerCount: number;
      respondentCount: number;
    }
  >();
  for (const stats of statsArray) {
    for (const row of stats.departmentScores) {
      const current = byDepartment.get(row.departmentId) ?? {
        departmentId: row.departmentId,
        departmentName: row.departmentName,
        favorability: [],
        weighted: [],
        enps: [],
        answerCount: 0,
        respondentCount: 0,
      };
      if (row.favorabilityPercent !== null) current.favorability.push(row.favorabilityPercent);
      if (row.weightedScorePercent !== null) current.weighted.push(row.weightedScorePercent);
      if (row.enps !== null) current.enps.push(row.enps);
      current.answerCount += row.answerCount;
      current.respondentCount += row.respondentCount;
      byDepartment.set(row.departmentId, current);
    }
  }
  return Array.from(byDepartment.values()).map((row) => ({
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    favorabilityPercent:
      row.favorability.length > 0
        ? Math.round(row.favorability.reduce((a, b) => a + b, 0) / row.favorability.length)
        : null,
    weightedScorePercent:
      row.weighted.length > 0
        ? Math.round(row.weighted.reduce((a, b) => a + b, 0) / row.weighted.length)
        : null,
    enps: row.enps.length > 0 ? Math.round(row.enps.reduce((a, b) => a + b, 0) / row.enps.length) : null,
    answerCount: row.answerCount,
    respondentCount: row.respondentCount,
  }));
}

function mergeDispatchStats(
  statsArray: ClimateSurveyDispatchDashboardStats[],
  base: MergedStatsBase,
): ClimateSurveyDispatchDashboardStats {
  const totalRecipients = statsArray.reduce((s, d) => s + d.totalRecipients, 0);
  const totalResponses = statsArray.reduce((s, d) => s + d.totalResponses, 0);
  const notResponded = Math.max(0, totalRecipients - totalResponses);
  const adherenceRate = totalRecipients > 0 ? totalResponses / totalRecipients : 0;

  const deptMap = new Map(base.departments.map((d) => [d.id, d]));
  for (const s of statsArray) {
    for (const d of s.departments) deptMap.set(d.id, d);
  }

  const questions = finalizeMergedQuestions(accumulateMergedQuestions(statsArray));
  const allNormalized = questions.flatMap((question) =>
    expandNormalizedScoresFromDistribution(question.scoreDirection, question.distribution),
  );
  const overallMetrics = metricsFromNormalizedScores(allNormalized);

  return {
    ...base,
    departments: Array.from(deptMap.values()),
    totalRecipients,
    totalResponses,
    notResponded,
    adherenceRate,
    avgScore: overallMetrics.avgScore,
    favorabilityPercent: overallMetrics.favorabilityPercent,
    weightedScorePercent: overallMetrics.weightedScorePercent,
    enps: overallMetrics.enps,
    enpsBreakdown: overallMetrics.enpsBreakdown,
    signedLinkToken: null,
    minRespondentsPercent: base.minRespondentsPercent,
    requiredRespondents: climateSurveyRequiredRespondents(totalRecipients, base.minRespondentsPercent),
    questions,
    dimensionScores: buildMergedDimensionScores(questions, statsArray),
    departmentScores: mergeDepartmentScores(statsArray),
  };
}

function computeMergedLabel(
  aggrStats: ClimateSurveyDispatchDashboardStats[],
): string {
  if (aggrStats.length === 0) return "Todos os departamentos";
  const allDepts = aggrStats.flatMap((s) => s.departments);
  const uniqueDepts = [...new Map(allDepts.map((d) => [d.id, d])).values()];
  if (uniqueDepts.length === 1) return uniqueDepts[0]?.name ?? "Todos os departamentos";
  return `${uniqueDepts.length} departamentos`;
}

function weightedScoreAccentClass(weightedScorePercent: number | null): string {
  if (weightedScorePercent === null) return "text-muted-foreground";
  return healthIndexAccent(weightedScorePercent);
}

interface DeptChartSectionProps {
  deptStats: ClimateSurveyDispatchDashboardStats;
}

function DeptChartSection({
  deptStats,
}: DeptChartSectionProps): React.ReactElement {
  const hasResponses = deptStats.totalResponses > 0;
  const awaitingThreshold = hasResponses && deptStats.totalResponses < deptStats.requiredRespondents;
  const hasEnoughForStats = deptStats.totalResponses >= deptStats.requiredRespondents;
  const deptAdherence = Math.round(deptStats.adherenceRate * 100);
  const deptLabel = deptStats.departments.length > 0
    ? deptStats.departments.map((d) => d.name).join(", ")
    : deptStats.configName;

  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold">{deptLabel}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <span>
            {deptStats.totalResponses}/{deptStats.totalRecipients} respostas
          </span>
          <span className={`font-bold ${adherenceClass(deptAdherence)}`}>
            {deptAdherence}% adesão
          </span>
          {deptStats.weightedScorePercent !== null && (
            <span
              className={`font-black text-sm font-mono ${weightedScoreAccentClass(deptStats.weightedScorePercent)}`}
            >
              {deptStats.weightedScorePercent}%{" "}
              <span className="text-[9px] font-normal text-muted-foreground">
                clima
              </span>
            </span>
          )}
          {deptStats.favorabilityPercent !== null && (
            <span className="font-bold text-foreground">
              {deptStats.favorabilityPercent}% favorabilidade
            </span>
          )}
          {deptStats.enps !== null && (
            <span className="font-bold text-foreground">eNPS {deptStats.enps}</span>
          )}
        </div>
      </div>

      {awaitingThreshold && (
        <div className="px-5 py-3 bg-status-warning-subtle border-b border-status-warning-border flex items-start gap-2">
          <span className="text-status-warning text-sm mt-px shrink-0">⚠</span>
          <p className="text-xs text-status-warning leading-relaxed">
            As estatísticas são exibidas somente quando há pelo menos{" "}
            <strong>{deptStats.requiredRespondents} respondentes</strong> — proteção ao anonimato dos colaboradores
            (mínimo de {deptStats.minRespondentsPercent}% de participação e {CLIMATE_SURVEY_MIN_RESPONDENTS_FLOOR} respondentes).
            Faltam{" "}
            <strong>{deptStats.requiredRespondents - deptStats.totalResponses} resposta{deptStats.requiredRespondents - deptStats.totalResponses === 1 ? "" : "s"}</strong>{" "}
            para liberar os dados.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="p-5 flex flex-col items-center justify-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Taxa de adesão
          </p>
          <ClimateSurveyAdherenceGauge rate={deptStats.adherenceRate} />
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
          {hasEnoughForStats ? (
            <ClimateSurveyQuestionScoreChart stats={deptStats} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              {awaitingThreshold
                ? `Aguardando mais ${deptStats.requiredRespondents - deptStats.totalResponses} resposta${deptStats.requiredRespondents - deptStats.totalResponses === 1 ? "" : "s"} para liberar as estatísticas.`
                : "Nenhuma resposta registrada ainda."}
            </p>
          )}
        </div>
      </div>

      {hasEnoughForStats && (
        <div className="border-t border-border">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Distribuição de notas
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[9px] text-muted-foreground">
                Clima:
              </span>
              <p
                className={`text-sm font-black ${weightedScoreAccentClass(deptStats.weightedScorePercent)}`}
              >
                {deptStats.weightedScorePercent !== null
                  ? `${deptStats.weightedScorePercent}%`
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
                  <ClimateSurveyScoreDistributionBar question={q} />
                </div>
                <div className="text-right">
                  {q.weightedScorePercent !== null ? (
                    <>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                        Clima
                      </p>
                      <p
                        className={`text-xl font-black ${weightedScoreAccentClass(q.weightedScorePercent)}`}
                      >
                        {q.weightedScorePercent}%
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Fav. {q.favorabilityPercent ?? "—"}%
                        {q.enps !== null ? ` · eNPS ${q.enps}` : ""}
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

function buildSameDayConfigMap(
  allDispatches: ClimateSurveyDispatchWithConfig[],
  anchorDay: string,
  timezone: string,
  anchorDispatchId: string,
): Map<string, ClimateSurveyDispatchWithConfig> {
  const map = new Map<string, ClimateSurveyDispatchWithConfig>();
  for (const d of allDispatches) {
    if (formatInTimeZone(new Date(d.scheduledAt), timezone, DAY_FORMAT) !== anchorDay) continue;
    const configId = d.climateSurveyConfiguration.id;
    const existing = map.get(configId);
    if (!existing) {
      map.set(configId, d);
    } else if (d.id === anchorDispatchId) {
      map.set(configId, d);
    } else if (existing.id !== anchorDispatchId && new Date(d.scheduledAt) > new Date(existing.scheduledAt)) {
      map.set(configId, d);
    }
  }
  return map;
}

function buildHistoryBucketMap(
  relevantDispatches: ClimateSurveyDispatchWithConfig[],
  timezone: string,
): Map<string, HistoryBucket> {
  const map = new Map<string, HistoryBucket>();
  for (const d of relevantDispatches) {
    const dayKey = formatInTimeZone(new Date(d.scheduledAt), timezone, DAY_FORMAT);
    const totalRecipients = d.deptDispatches.reduce((s, dd) => s + dd.totalRecipients, 0);
    const totalResponses = d.deptDispatches.reduce((s, dd) => s + dd.totalResponses, 0);
    const existing = map.get(dayKey);
    if (existing !== undefined) {
      existing.totalRecipients += totalRecipients;
      existing.totalResponses += totalResponses;
    } else {
      map.set(dayKey, {
        dayKey,
        scheduledAt: new Date(d.scheduledAt),
        totalRecipients,
        totalResponses,
        dispatchId: d.id,
      });
    }
  }
  return map;
}

async function buildDispatchComparisonData(
  tenantId: string,
  relevantDispatches: ClimateSurveyDispatchWithConfig[],
  anchorDayKey: string,
  mergedStats: ClimateSurveyDispatchDashboardStats,
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
      ? await getClimateSurveyMultipleDispatchDashboards(tenantId, allPreviousIds)
      : [];
  const statsById = new Map(allPreviousStats.map((s) => [s.id, s]));

  const previousPoints: ComparisonPoint[] = previousDayKeys
    .map((dayKey) => {
      const ids = dayToIds.get(dayKey) ?? [];
      const dayStats = ids
        .map((id) => statsById.get(id))
        .filter((s): s is ClimateSurveyDispatchDashboardStats => s !== undefined);
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
        configName: firstStat.configName,
        departments: firstStat.departments,
        status: "available",
        scheduledAt: firstDispatch ? new Date(firstDispatch.scheduledAt) : new Date(),
        dispatchedAt: null,
        frequency: firstStat.frequency,
        minRespondentsPercent: firstStat.minRespondentsPercent,
      };
      const dayMerged = mergeDispatchStats(dayStats, base);
      return {
        date: firstDispatch ? formatInTimeZone(new Date(firstDispatch.scheduledAt), timezone, "dd/MM") : dayKey,
        healthIndex: dayMerged.weightedScorePercent,
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
      healthIndex: mergedStats.weightedScorePercent,
      adherence: Math.round(mergedStats.adherenceRate * 100),
      isCurrent: true,
      dispatchId: anchorDispatchId,
    },
  ];
}

function parseSelectedDepartmentIds(rawDepts: string | string[] | undefined): string[] {
  return (
    Array.isArray(rawDepts)
      ? rawDepts
      : (rawDepts?.split(",").filter(Boolean) ?? [])
  ).filter(Boolean);
}

function buildDeptAdherenceRanking(
  allDayDispatches: ClimateSurveyDispatchWithConfig[],
): DeptRankingItem[] {
  const deptAdhMap = new Map<string, { name: string; totalRecipients: number; totalResponses: number }>();
  for (const d of allDayDispatches) {
    for (const cd of d.climateSurveyConfiguration.configDepartments) {
      const deptId = cd.department.id;
      const dd = d.deptDispatches.find((r) => r.departmentId === deptId);
      const entry = deptAdhMap.get(deptId) ?? { name: cd.department.name, totalRecipients: 0, totalResponses: 0 };
      deptAdhMap.set(deptId, {
        name: cd.department.name,
        totalRecipients: entry.totalRecipients + (dd?.totalRecipients ?? 0),
        totalResponses: entry.totalResponses + (dd?.totalResponses ?? 0),
      });
    }
  }
  return Array.from(deptAdhMap.entries())
    .map(([id, { name, totalRecipients, totalResponses }]) => ({
      id,
      name,
      healthIndex: null as number | null,
      adherence: totalRecipients > 0 ? Math.round((totalResponses / totalRecipients) * 100) : 0,
      responses: totalResponses,
      recipients: totalRecipients,
    }))
    .sort(sortDeptRankingItems);
}

function sumFilteredDeptTotals(
  allDayDispatches: ClimateSurveyDispatchWithConfig[],
  selectedIds: string[],
): { recipients: number; responses: number } {
  const filtered = allDayDispatches.flatMap((d) =>
    d.deptDispatches.filter((dd) => selectedIds.length === 0 || selectedIds.includes(dd.departmentId)),
  );
  return {
    recipients: filtered.reduce((sum, dd) => sum + dd.totalRecipients, 0),
    responses: filtered.reduce((sum, dd) => sum + dd.totalResponses, 0),
  };
}

export default async function ClimateSurveyDispatchDetailPage({
  params,
  searchParams,
}: ClimateSurveyDispatchDetailPageProps): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasTenantPlanFeature(session.tenantId, "climate_surveys"))) redirect("/dashboard");

  const { dispatchId } = await params;
  const resolvedSearch = await searchParams;

  const [anchorStats, allDispatches, org, canCreateActionPlan] = await Promise.all([
    getClimateSurveyDispatchDashboard(session.tenantId, dispatchId),
    getClimateSurveyDispatches(session.tenantId),
    getOrganization(session.tenantId),
    hasTenantPlanFeature(session.tenantId, "action_plans"),
  ]);
  if (!anchorStats) notFound();

  const timezone = org?.timezone ?? "America/Sao_Paulo"

  const anchorDay = formatInTimeZone(anchorStats.scheduledAt, timezone, DAY_FORMAT);

  const sameDayConfigMap = buildSameDayConfigMap(allDispatches, anchorDay, timezone, dispatchId);

  const allDeptOptions = Array.from(
    new Map(
      Array.from(sameDayConfigMap.values())
        .flatMap((d) => d.climateSurveyConfiguration.configDepartments.map((cd) => cd.department))
        .map((dept) => [dept.id, dept]),
    ).values(),
  ).map((dept) => ({ id: dept.id, name: dept.name }));

  const selectedIds = parseSelectedDepartmentIds(resolvedSearch.depts);

  const aggrDispatches =
    selectedIds.length > 0
      ? Array.from(sameDayConfigMap.values()).filter((d) =>
          d.climateSurveyConfiguration.configDepartments.some((cd) =>
            selectedIds.includes(cd.department.id),
          ),
        )
      : Array.from(sameDayConfigMap.values());

  const aggrStats = await getClimateSurveyMultipleDispatchDashboards(
    session.tenantId,
    aggrDispatches.map((d) => d.id),
    selectedIds.length > 0 ? selectedIds : undefined,
  );

  const allDayDispatches = Array.from(sameDayConfigMap.values());
  const anchorDispatchRecord = allDayDispatches.find((d) => d.id === dispatchId);
  const anchorConfigId = anchorDispatchRecord?.climateSurveyConfiguration.id ?? null;
  const commentDispatches =
    anchorConfigId !== null
      ? allDayDispatches.filter((d) => d.climateSurveyConfiguration.id === anchorConfigId)
      : [];
  const openComments = await getClimateSurveyOpenComments(
    session.tenantId,
    commentDispatches.map((d) => d.id),
  );
  const deptRanking = buildDeptAdherenceRanking(allDayDispatches);
  const { recipients: filteredDeptRecipients, responses: filteredDeptResponses } = sumFilteredDeptTotals(
    allDayDispatches,
    selectedIds,
  );
  const filteredAdherenceRate = filteredDeptRecipients > 0 ? filteredDeptResponses / filteredDeptRecipients : 0;

  const mergedStatsBase: MergedStatsBase = {
    id: anchorStats.id,
    configName: anchorStats.configName,
    departments: anchorStats.departments,
    status: anchorStats.status,
    scheduledAt: anchorStats.scheduledAt,
    dispatchedAt: anchorStats.dispatchedAt,
    frequency: anchorStats.frequency,
    minRespondentsPercent: anchorStats.minRespondentsPercent,
  };
  const mergedStats = {
    ...mergeDispatchStats(aggrStats, mergedStatsBase),
    totalRecipients: filteredDeptRecipients,
    totalResponses: filteredDeptResponses,
    notResponded: Math.max(0, filteredDeptRecipients - filteredDeptResponses),
    adherenceRate: filteredAdherenceRate,
  }

  const showDeptBreakdown = deptRanking.length > 1;

  const historyDeptName =
    selectedIds.length > 0
      ? deptRanking
          .filter((r) => selectedIds.includes(r.id))
          .map((r) => r.name)
          .join(", ") || computeMergedLabel(aggrStats)
      : computeMergedLabel(aggrStats)

  const historyConfigIds =
    selectedIds.length > 0
      ? Array.from(sameDayConfigMap.entries())
          .filter(([, d]) =>
            d.climateSurveyConfiguration.configDepartments.some((cd) =>
              selectedIds.includes(cd.department.id),
            ),
          )
          .map(([configId]) => configId)
      : Array.from(sameDayConfigMap.keys());

  const relevantConfigIds = new Set(historyConfigIds);

  const relevantDispatches = allDispatches.filter((d: ClimateSurveyDispatchWithConfig) =>
    relevantConfigIds.has(d.climateSurveyConfiguration.id),
  );

  const historyBucketMap = buildHistoryBucketMap(relevantDispatches, timezone);

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

  const headerSubtitle = [
    anchorStats.departments.map((d) => d.name).join(", ") || anchorStats.configName,
    formatInTimeZone(
      new Date(anchorStats.scheduledAt),
      timezone,
      "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
      { locale: ptBR },
    ),
    FREQUENCY_LABELS[anchorStats.frequency] ?? anchorStats.frequency,
  ].join(" · ");

  return (
    <div className="flex flex-col h-full">
        <div className="border-b border-border bg-card px-6 py-4 shrink-0">
          <Link href="/climate-surveys/dispatches" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Disparo & Canais</Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold uppercase tracking-widest">
                  Resultados da onda
                </h1>
                <span
                  className={`${BADGE_BASE} shrink-0 ${STATUS_STYLE[anchorStats.status] ?? BADGE_DEFAULT}`}
                >
                  {STATUS_LABELS[anchorStats.status] ?? anchorStats.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {headerSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {canCreateActionPlan && (
                <CreateClimateSurveyActionPlanButton dispatchId={dispatchId} />
              )}
              {allDeptOptions.length > 1 && (
                <ClimateSurveyDispatchDeptFilter departments={allDeptOptions} />
              )}
            </div>
          </div>
        </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className={`grid gap-0 border border-border bg-card ${mergedStats.weightedScorePercent !== null ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
          {mergedStats.weightedScorePercent !== null && (
            <div className="px-5 py-4 border-r border-border">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Clima
                </p>
              </div>
              <p
                className={`text-3xl font-black ${weightedScoreAccentClass(mergedStats.weightedScorePercent)}`}
              >
                {mergedStats.weightedScorePercent}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Fav. {mergedStats.favorabilityPercent ?? "—"}%
                {mergedStats.enps !== null ? ` · eNPS ${mergedStats.enps}` : ""}
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
                {aggrStats.length} pesquisas
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

        {showDeptBreakdown && <ClimateSurveyDispatchDeptBreakdownTable items={deptRanking} />}

        {anchorStats.signedLinkToken !== null && (
          <ClimateSurveySignedLinkCopy
            signedLink={`${env.NEXT_PUBLIC_APP_URL}/climate-survey/link/${anchorStats.signedLinkToken}`}
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
            <ClimateSurveyDispatchComparisonChart data={comparisonData} />
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
            <ClimateSurveyDeptTrendChart data={trendData} currentId={anchorDayKey} />
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
                      href={`/climate-surveys/${b.dispatchId}${deptsQuery}`}
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

        {openComments.length > 0 && (
          <div className="border border-border bg-card">
            <div className="border-b border-border px-5 py-3 bg-muted/30">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                Comentários anônimos
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Respostas abertas dos participantes, sem identificação de autor ou setor.
              </p>
            </div>
            <div className="divide-y divide-border">
              {openComments.map((comment) => (
                <div key={comment.id} className="px-5 py-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {comment.openComment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
