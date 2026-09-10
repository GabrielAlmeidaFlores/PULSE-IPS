import type { ClimateSurveyTopic as PrismaClimateSurveyTopic } from "@prisma/client"
import { prisma } from "@/libs/db"
import type {
  ClimateSurveySystemTopicDefinition,
  ClimateSurveyTopic,
} from "@/modules/climate-surveys/climate-survey.types"

function mapClimateSurveyTopic(topic: PrismaClimateSurveyTopic): ClimateSurveyTopic {
  return {
    id: topic.id,
    tenantId: topic.tenantId,
    key: topic.key,
    label: topic.label,
    isSystem: topic.isSystem,
    isActive: topic.isActive,
    sortOrder: topic.sortOrder,
  }
}

export async function findClimateSurveyTopicsByTenant(tenantId: string): Promise<ClimateSurveyTopic[]> {
  const topics = await prisma.climateSurveyTopic.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  })
  return topics.map(mapClimateSurveyTopic)
}

export async function findAllClimateSurveyTopicsByTenant(tenantId: string): Promise<ClimateSurveyTopic[]> {
  const topics = await prisma.climateSurveyTopic.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  })
  return topics.map(mapClimateSurveyTopic)
}

export async function findClimateSurveyTopicByKey(
  tenantId: string,
  key: string,
): Promise<ClimateSurveyTopic | null> {
  const topic = await prisma.climateSurveyTopic.findFirst({ where: { tenantId, key } })
  return topic !== null ? mapClimateSurveyTopic(topic) : null
}

export async function findClimateSurveyTopicById(
  tenantId: string,
  id: string,
): Promise<ClimateSurveyTopic | null> {
  const topic = await prisma.climateSurveyTopic.findFirst({ where: { tenantId, id } })
  return topic !== null ? mapClimateSurveyTopic(topic) : null
}

export async function findMaxClimateSurveyTopicSortOrder(tenantId: string): Promise<number> {
  const result = await prisma.climateSurveyTopic.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  })
  return result._max.sortOrder ?? 0
}

export function createManyClimateSurveySystemTopics(
  tenantId: string,
  topics: ClimateSurveySystemTopicDefinition[],
): Promise<{ count: number }> {
  return prisma.climateSurveyTopic.createMany({
    data: topics.map((topic) => ({
      tenantId,
      key: topic.key,
      label: topic.label,
      isSystem: true,
      sortOrder: topic.sortOrder,
    })),
    skipDuplicates: true,
  })
}

export async function createClimateSurveyTopicEntry(
  tenantId: string,
  input: { key: string; label: string; sortOrder: number },
): Promise<ClimateSurveyTopic> {
  const topic = await prisma.climateSurveyTopic.create({
    data: {
      tenantId,
      key: input.key,
      label: input.label,
      sortOrder: input.sortOrder,
      isSystem: false,
    },
  })
  return mapClimateSurveyTopic(topic)
}

export function updateClimateSurveyTopicLabel(
  tenantId: string,
  id: string,
  label: string,
): Promise<{ count: number }> {
  return prisma.climateSurveyTopic.updateMany({ where: { id, tenantId }, data: { label } })
}

export function updateClimateSurveyTopicActiveState(
  tenantId: string,
  id: string,
  isActive: boolean,
): Promise<{ count: number }> {
  return prisma.climateSurveyTopic.updateMany({ where: { id, tenantId }, data: { isActive } })
}
