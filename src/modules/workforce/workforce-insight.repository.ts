import type { WorkforceInsight as PrismaWorkforceInsight } from "@prisma/client"
import { prisma } from "@/libs/db"
import type {
  CreateWorkforceInsightInput,
  WorkforceInsight,
  WorkforceInsightKind,
  WorkforceInsightSeverity,
} from "@/modules/workforce/workforce.types"

const WORKFORCE_INSIGHT_KINDS: WorkforceInsightKind[] = ["root_cause", "burnout_risk", "action_suggestion"]

const WORKFORCE_INSIGHT_SEVERITIES: WorkforceInsightSeverity[] = ["high", "medium", "low"]

function toWorkforceInsightKind(value: string): WorkforceInsightKind {
  return WORKFORCE_INSIGHT_KINDS.find((kind) => kind === value) ?? "root_cause"
}

function toWorkforceInsightSeverity(value: string): WorkforceInsightSeverity {
  return WORKFORCE_INSIGHT_SEVERITIES.find((severity) => severity === value) ?? "medium"
}

function mapWorkforceInsight(insight: PrismaWorkforceInsight): WorkforceInsight {
  return {
    id: insight.id,
    tenantId: insight.tenantId,
    competencia: insight.competencia,
    kind: toWorkforceInsightKind(insight.kind),
    severity: toWorkforceInsightSeverity(insight.severity),
    departmentName: insight.departmentName,
    title: insight.title,
    description: insight.description,
    createdAt: insight.createdAt,
  }
}

export async function findWorkforceInsights(
  tenantId: string,
  competencia: string,
): Promise<WorkforceInsight[]> {
  const insights = await prisma.workforceInsight.findMany({
    where: { tenantId, competencia },
    orderBy: { createdAt: "asc" },
  })
  return insights.map(mapWorkforceInsight)
}

export async function replaceWorkforceInsights(
  tenantId: string,
  competencia: string,
  insights: CreateWorkforceInsightInput[],
): Promise<void> {
  const operations = [prisma.workforceInsight.deleteMany({ where: { tenantId, competencia } })]
  if (insights.length > 0) {
    operations.push(
      prisma.workforceInsight.createMany({
        data: insights.map((insight) => ({
          tenantId,
          competencia,
          kind: insight.kind,
          severity: insight.severity,
          departmentName: insight.departmentName ?? null,
          title: insight.title,
          description: insight.description,
        })),
      }),
    )
  }
  await prisma.$transaction(operations)
}
