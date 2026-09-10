import { AppError } from "@/libs/errors/app-error"
import { generateSlug } from "@/libs/utils/slug"
import {
  CLIMATE_SURVEY_SYSTEM_TOPICS,
  isClimateSurveyLegacyTopicAlias,
  type ClimateSurveyTopic,
  type ClimateSurveyTopicOption,
} from "@/modules/climate-surveys/climate-survey.types"
import {
  createClimateSurveyTopicEntry,
  createManyClimateSurveySystemTopics,
  findAllClimateSurveyTopicsByTenant,
  findClimateSurveyTopicById,
  findClimateSurveyTopicByKey,
  findClimateSurveyTopicsByTenant,
  findMaxClimateSurveyTopicSortOrder,
  updateClimateSurveyTopicActiveState,
  updateClimateSurveyTopicLabel,
} from "@/modules/climate-surveys/climate-survey-topic.repository"

export async function ensureClimateSurveySystemTopics(tenantId: string): Promise<void> {
  await createManyClimateSurveySystemTopics(tenantId, CLIMATE_SURVEY_SYSTEM_TOPICS)
}

export function listClimateSurveyTopics(tenantId: string): Promise<ClimateSurveyTopic[]> {
  return findClimateSurveyTopicsByTenant(tenantId)
}

export async function listClimateSurveyTopicOptions(tenantId: string): Promise<ClimateSurveyTopicOption[]> {
  await ensureClimateSurveySystemTopics(tenantId)
  const topics = await findAllClimateSurveyTopicsByTenant(tenantId)
  return topics.map((topic) => ({
    id: topic.id,
    key: topic.key,
    label: topic.label,
    isSystem: topic.isSystem,
    isActive: topic.isActive,
  }))
}

export async function getClimateSurveyTopicLabelMap(tenantId: string): Promise<Map<string, string>> {
  const topics = await findAllClimateSurveyTopicsByTenant(tenantId)
  return new Map(topics.map((topic) => [topic.key, topic.label]))
}

export async function createClimateSurveyTopic(tenantId: string, label: string): Promise<ClimateSurveyTopic> {
  const trimmedLabel = label.trim()
  if (trimmedLabel.length === 0) {
    throw new AppError("TOPIC_LABEL_REQUIRED", "Informe o nome do tópico.")
  }
  const baseKey = generateSlug(trimmedLabel)
  if (baseKey.length === 0) {
    throw new AppError("TOPIC_LABEL_INVALID", "O nome do tópico precisa conter letras ou números.")
  }

  await ensureClimateSurveySystemTopics(tenantId)

  let candidateKey = baseKey
  let suffix = 2
  while (
    isClimateSurveyLegacyTopicAlias(candidateKey) ||
    (await findClimateSurveyTopicByKey(tenantId, candidateKey)) !== null
  ) {
    candidateKey = `${baseKey}-${String(suffix)}`
    suffix += 1
  }

  const maxSortOrder = await findMaxClimateSurveyTopicSortOrder(tenantId)
  return createClimateSurveyTopicEntry(tenantId, {
    key: candidateKey,
    label: trimmedLabel,
    sortOrder: maxSortOrder + 1,
  })
}

export async function renameClimateSurveyTopic(
  tenantId: string,
  topicId: string,
  label: string,
): Promise<void> {
  const trimmedLabel = label.trim()
  if (trimmedLabel.length === 0) {
    throw new AppError("TOPIC_LABEL_REQUIRED", "Informe o nome do tópico.")
  }
  const existing = await findClimateSurveyTopicById(tenantId, topicId)
  if (existing === null) {
    throw new AppError("TOPIC_NOT_FOUND", "Tópico não encontrado.")
  }
  if (existing.isSystem) {
    throw new AppError("TOPIC_SYSTEM_PROTECTED", "Tópicos padrão não podem ser editados.")
  }
  await updateClimateSurveyTopicLabel(tenantId, topicId, trimmedLabel)
}

export async function deactivateClimateSurveyTopic(tenantId: string, topicId: string): Promise<void> {
  const existing = await findClimateSurveyTopicById(tenantId, topicId)
  if (existing === null) {
    throw new AppError("TOPIC_NOT_FOUND", "Tópico não encontrado.")
  }
  if (existing.isSystem) {
    throw new AppError("TOPIC_SYSTEM_PROTECTED", "Tópicos padrão não podem ser excluídos.")
  }
  await updateClimateSurveyTopicActiveState(tenantId, topicId, false)
}

export async function assertClimateSurveyTopicKeysExist(
  tenantId: string,
  topicKeys: string[],
): Promise<void> {
  if (topicKeys.length === 0) return
  await ensureClimateSurveySystemTopics(tenantId)
  const topics = await findAllClimateSurveyTopicsByTenant(tenantId)
  const validKeys = new Set(topics.map((topic) => topic.key))
  for (const key of topicKeys) {
    if (!validKeys.has(key)) {
      throw new AppError("TOPIC_NOT_FOUND", "Um dos tópicos selecionados não existe mais.")
    }
  }
}
