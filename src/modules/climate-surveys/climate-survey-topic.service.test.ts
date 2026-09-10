import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  assertClimateSurveyTopicKeysExist,
  createClimateSurveyTopic,
  deactivateClimateSurveyTopic,
  ensureClimateSurveySystemTopics,
  getClimateSurveyTopicLabelMap,
  listClimateSurveyTopicOptions,
  listClimateSurveyTopics,
  renameClimateSurveyTopic,
} from "@/modules/climate-surveys/climate-survey-topic.service"
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

vi.mock("@/modules/climate-surveys/climate-survey-topic.repository")

const TENANT_ID = "tenant-1"
const SYSTEM_TOPIC_KEY = "job_satisfaction"
const SYSTEM_TOPIC_LABEL = "Satisfação no Trabalho"
const CUSTOM_TOPIC_KEY = "seguranca-psicologica"
const CUSTOM_TOPIC_LABEL = "Segurança Psicológica"

const SYSTEM_TOPIC = {
  id: "topic-system",
  tenantId: TENANT_ID,
  key: SYSTEM_TOPIC_KEY,
  label: SYSTEM_TOPIC_LABEL,
  isSystem: true,
  isActive: true,
  sortOrder: 1,
}

const CUSTOM_TOPIC = {
  id: "topic-custom",
  tenantId: TENANT_ID,
  key: CUSTOM_TOPIC_KEY,
  label: CUSTOM_TOPIC_LABEL,
  isSystem: false,
  isActive: true,
  sortOrder: 9,
}

const mockFindTopics = vi.mocked(findClimateSurveyTopicsByTenant)
const mockFindAllTopics = vi.mocked(findAllClimateSurveyTopicsByTenant)
const mockFindByKey = vi.mocked(findClimateSurveyTopicByKey)
const mockFindById = vi.mocked(findClimateSurveyTopicById)
const mockFindMaxSortOrder = vi.mocked(findMaxClimateSurveyTopicSortOrder)
const mockCreateMany = vi.mocked(createManyClimateSurveySystemTopics)
const mockCreateEntry = vi.mocked(createClimateSurveyTopicEntry)
const mockUpdateLabel = vi.mocked(updateClimateSurveyTopicLabel)
const mockUpdateActive = vi.mocked(updateClimateSurveyTopicActiveState)

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateMany.mockResolvedValue({ count: 8 })
  mockFindTopics.mockResolvedValue([
    SYSTEM_TOPIC,
    CUSTOM_TOPIC,
  ] as Awaited<ReturnType<typeof findClimateSurveyTopicsByTenant>>)
  mockFindAllTopics.mockResolvedValue([
    SYSTEM_TOPIC,
    CUSTOM_TOPIC,
  ] as Awaited<ReturnType<typeof findAllClimateSurveyTopicsByTenant>>)
  mockFindMaxSortOrder.mockResolvedValue(8)
})

describe("ensureClimateSurveySystemTopics", () => {
  it("cria os tópicos de sistema do tenant", async () => {
    await ensureClimateSurveySystemTopics(TENANT_ID)

    expect(mockCreateMany).toHaveBeenCalledWith(
      TENANT_ID,
      expect.arrayContaining([expect.objectContaining({ key: SYSTEM_TOPIC_KEY })]),
    )
  })
})

describe("listClimateSurveyTopics", () => {
  it("lista os tópicos do tenant sem escrever", async () => {
    const result = await listClimateSurveyTopics(TENANT_ID)

    expect(mockCreateMany).not.toHaveBeenCalled()
    expect(result).toHaveLength(2)
    expect(result[1]?.key).toBe(CUSTOM_TOPIC_KEY)
  })
})

describe("getClimateSurveyTopicLabelMap", () => {
  it("mapeia chave para label", async () => {
    const map = await getClimateSurveyTopicLabelMap(TENANT_ID)

    expect(map.get(SYSTEM_TOPIC_KEY)).toBe(SYSTEM_TOPIC_LABEL)
    expect(map.get(CUSTOM_TOPIC_KEY)).toBe(CUSTOM_TOPIC_LABEL)
  })
})

describe("listClimateSurveyTopicOptions", () => {
  it("garante os tópicos de sistema e retorna as opções", async () => {
    const options = await listClimateSurveyTopicOptions(TENANT_ID)

    expect(mockCreateMany).toHaveBeenCalledWith(TENANT_ID, expect.any(Array))
    expect(options).toEqual([
      { id: SYSTEM_TOPIC.id, key: SYSTEM_TOPIC_KEY, label: SYSTEM_TOPIC_LABEL, isSystem: true, isActive: true },
      { id: CUSTOM_TOPIC.id, key: CUSTOM_TOPIC_KEY, label: CUSTOM_TOPIC_LABEL, isSystem: false, isActive: true },
    ])
  })
})

describe("createClimateSurveyTopic", () => {
  it("lança AppError quando o nome é vazio", async () => {
    await expect(createClimateSurveyTopic(TENANT_ID, "   ")).rejects.toMatchObject({
      code: "TOPIC_LABEL_REQUIRED",
    })
    expect(mockCreateEntry).not.toHaveBeenCalled()
  })

  it("lança AppError quando o nome não gera slug válido", async () => {
    await expect(createClimateSurveyTopic(TENANT_ID, "!!!")).rejects.toMatchObject({
      code: "TOPIC_LABEL_INVALID",
    })
    expect(mockCreateEntry).not.toHaveBeenCalled()
  })

  it("cria o tópico com slug e sortOrder incremental", async () => {
    mockFindByKey.mockResolvedValue(null)
    mockCreateEntry.mockResolvedValue(CUSTOM_TOPIC as Awaited<ReturnType<typeof createClimateSurveyTopicEntry>>)

    const result = await createClimateSurveyTopic(TENANT_ID, CUSTOM_TOPIC_LABEL)

    expect(mockCreateEntry).toHaveBeenCalledWith(TENANT_ID, {
      key: CUSTOM_TOPIC_KEY,
      label: CUSTOM_TOPIC_LABEL,
      sortOrder: 9,
    })
    expect(result.key).toBe(CUSTOM_TOPIC_KEY)
  })

  it("adiciona sufixo quando a chave já existe", async () => {
    mockFindByKey
      .mockResolvedValueOnce(SYSTEM_TOPIC as Awaited<ReturnType<typeof findClimateSurveyTopicByKey>>)
      .mockResolvedValueOnce(null)
    mockCreateEntry.mockResolvedValue(CUSTOM_TOPIC as Awaited<ReturnType<typeof createClimateSurveyTopicEntry>>)

    await createClimateSurveyTopic(TENANT_ID, SYSTEM_TOPIC_LABEL)

    expect(mockCreateEntry).toHaveBeenCalledWith(TENANT_ID, {
      key: "satisfacao-no-trabalho-2",
      label: SYSTEM_TOPIC_LABEL,
      sortOrder: 9,
    })
  })

  it("evita chave que colida com alias legado", async () => {
    mockFindByKey.mockResolvedValue(null)
    mockCreateEntry.mockResolvedValue(CUSTOM_TOPIC as Awaited<ReturnType<typeof createClimateSurveyTopicEntry>>)

    await createClimateSurveyTopic(TENANT_ID, "Other")

    expect(mockCreateEntry).toHaveBeenCalledWith(TENANT_ID, {
      key: "other-2",
      label: "Other",
      sortOrder: 9,
    })
  })
})

describe("renameClimateSurveyTopic", () => {
  it("lança AppError quando o tópico não existe", async () => {
    mockFindById.mockResolvedValue(null)

    await expect(renameClimateSurveyTopic(TENANT_ID, "missing", "Novo nome")).rejects.toMatchObject({
      code: "TOPIC_NOT_FOUND",
    })
    expect(mockUpdateLabel).not.toHaveBeenCalled()
  })

  it("lança AppError quando o nome é vazio", async () => {
    await expect(renameClimateSurveyTopic(TENANT_ID, CUSTOM_TOPIC.id, "   ")).rejects.toMatchObject({
      code: "TOPIC_LABEL_REQUIRED",
    })
    expect(mockUpdateLabel).not.toHaveBeenCalled()
  })

  it("impede renomear tópico de sistema", async () => {
    mockFindById.mockResolvedValue(SYSTEM_TOPIC as Awaited<ReturnType<typeof findClimateSurveyTopicById>>)

    await expect(renameClimateSurveyTopic(TENANT_ID, SYSTEM_TOPIC.id, "Novo nome")).rejects.toMatchObject({
      code: "TOPIC_SYSTEM_PROTECTED",
    })
    expect(mockUpdateLabel).not.toHaveBeenCalled()
  })

  it("renomeia o tópico existente", async () => {
    mockFindById.mockResolvedValue(CUSTOM_TOPIC as Awaited<ReturnType<typeof findClimateSurveyTopicById>>)

    await renameClimateSurveyTopic(TENANT_ID, CUSTOM_TOPIC.id, "  Novo nome  ")

    expect(mockUpdateLabel).toHaveBeenCalledWith(TENANT_ID, CUSTOM_TOPIC.id, "Novo nome")
  })
})

describe("deactivateClimateSurveyTopic", () => {
  it("lança AppError quando o tópico não existe", async () => {
    mockFindById.mockResolvedValue(null)

    await expect(deactivateClimateSurveyTopic(TENANT_ID, "missing")).rejects.toMatchObject({
      code: "TOPIC_NOT_FOUND",
    })
  })

  it("impede desativar tópico de sistema", async () => {
    mockFindById.mockResolvedValue(SYSTEM_TOPIC as Awaited<ReturnType<typeof findClimateSurveyTopicById>>)

    await expect(deactivateClimateSurveyTopic(TENANT_ID, SYSTEM_TOPIC.id)).rejects.toMatchObject({
      code: "TOPIC_SYSTEM_PROTECTED",
    })
    expect(mockUpdateActive).not.toHaveBeenCalled()
  })

  it("desativa tópico customizado", async () => {
    mockFindById.mockResolvedValue(CUSTOM_TOPIC as Awaited<ReturnType<typeof findClimateSurveyTopicById>>)

    await deactivateClimateSurveyTopic(TENANT_ID, CUSTOM_TOPIC.id)

    expect(mockUpdateActive).toHaveBeenCalledWith(TENANT_ID, CUSTOM_TOPIC.id, false)
  })
})

describe("assertClimateSurveyTopicKeysExist", () => {
  it("não consulta o banco quando não há chaves", async () => {
    await assertClimateSurveyTopicKeysExist(TENANT_ID, [])

    expect(mockCreateMany).not.toHaveBeenCalled()
  })

  it("lança AppError para chave inexistente", async () => {
    await expect(
      assertClimateSurveyTopicKeysExist(TENANT_ID, [SYSTEM_TOPIC_KEY, "inexistente"]),
    ).rejects.toMatchObject({ code: "TOPIC_NOT_FOUND" })
  })

  it("não lança para chaves existentes", async () => {
    await expect(
      assertClimateSurveyTopicKeysExist(TENANT_ID, [SYSTEM_TOPIC_KEY, CUSTOM_TOPIC_KEY]),
    ).resolves.toBeUndefined()
  })
})
