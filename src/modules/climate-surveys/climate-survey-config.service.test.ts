import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getClimateSurveyConfigs,
  getClimateSurveyConfig,
  getClimateSurveyConfigsPaginated,
  getClimateSurveyConfigsWithDepartments,
  createClimateSurveyForDepartments,
  updateClimateSurveyConfig,
  deactivateClimateSurveyConfig,
  duplicateClimateSurveyConfig,
} from "@/modules/climate-surveys/climate-survey-config.service"
import {
  findClimateSurveyConfigsByTenant,
  findClimateSurveyConfigsByTenantPaginated,
  findClimateSurveyConfigById,
  createNewClimateSurveyConfigEntry,
  updateExistingClimateSurveyConfigEntry,
  deactivateClimateSurveyConfigEntry,
} from "@/modules/climate-surveys/climate-survey.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"

vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/departments/department.repository")
vi.mock("@/modules/climate-surveys/climate-survey-topic.service", async () => {
  const { CLIMATE_SURVEY_SYSTEM_TOPICS } = await import("@/modules/climate-surveys/climate-survey.types")
  const topics = CLIMATE_SURVEY_SYSTEM_TOPICS.map((topic) => ({
    id: topic.key,
    tenantId: "tenant-1",
    key: topic.key,
    label: topic.label,
    isSystem: true,
    isActive: true,
    sortOrder: topic.sortOrder,
  }))
  return {
    ensureClimateSurveySystemTopics: vi.fn().mockResolvedValue(undefined),
    listClimateSurveyTopics: vi.fn().mockResolvedValue(topics),
    listClimateSurveyTopicOptions: vi.fn().mockResolvedValue(
      topics.map((topic) => ({ id: topic.id, key: topic.key, label: topic.label, isSystem: true, isActive: true })),
    ),
    getClimateSurveyTopicLabelMap: vi.fn().mockResolvedValue(
      new Map(topics.map((topic) => [topic.key, topic.label])),
    ),
    createClimateSurveyTopic: vi.fn(),
    renameClimateSurveyTopic: vi.fn(),
    deactivateClimateSurveyTopic: vi.fn(),
    assertClimateSurveyTopicKeysExist: vi.fn().mockResolvedValue(undefined),
  }
})
vi.mock("@/modules/climate-surveys/climate-survey-analytics.service", () => ({
  recordClimateSurveyCreated: vi.fn(),
  recordClimateSurveyQuestionsSelected: vi.fn(),
}))
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindConfigs = vi.mocked(findClimateSurveyConfigsByTenant)
const mockFindConfigsPaginated = vi.mocked(findClimateSurveyConfigsByTenantPaginated)
const mockFindConfig = vi.mocked(findClimateSurveyConfigById)
const mockCreateNewConfig = vi.mocked(createNewClimateSurveyConfigEntry)
const mockUpdateConfig = vi.mocked(updateExistingClimateSurveyConfigEntry)
const mockDeactivateConfig = vi.mocked(deactivateClimateSurveyConfigEntry)
const mockFindActiveDepts = vi.mocked(findActiveDepartmentsByTenant)


const SCORE_DIRECTION_HIGHER = "higher_is_better" as const
const QUESTION_TEXT_1 = "Pergunta 1"
const BASE_QUESTIONS = [{ text: QUESTION_TEXT_1, order: 1, scoreDirection: SCORE_DIRECTION_HIGHER, dimension: "job_satisfaction" as const }]
const BASE_CONFIG_INPUT = {
  name: "Pesquisa Teste",
  frequency: "weekly" as const,
  scheduledDayOfMonth: null,
  dispatchTime: "09:00",
  workDays: [1, 2, 3, 4, 5],
  respectEmployeeSchedule: false,
  tokenExpiryHours: 48,
  sendViaMessaging: true,
  sendViaSignedLink: true,
  questions: BASE_QUESTIONS,
}
const BASE_UPDATE_INPUT = {
  ...BASE_CONFIG_INPUT,
  description: undefined as string | undefined,
  departmentIds: ["dept-1"],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getClimateSurveyConfigs", () => {
  it("returns all health survey configs for the tenant", async () => {
    mockFindConfigs.mockResolvedValue([{ id: "cfg-1" }] as Awaited<ReturnType<typeof findClimateSurveyConfigsByTenant>>)
    const result = await getClimateSurveyConfigs("tenant-1")
    expect(result).toEqual([{ id: "cfg-1" }])
    expect(mockFindConfigs).toHaveBeenCalledWith("tenant-1")
  })
})

describe("getClimateSurveyConfigsPaginated", () => {
  it("delega ao repository com skip/take calculados corretamente", async () => {
    mockFindConfigsPaginated.mockResolvedValue({ items: [], total: 0 })

    await getClimateSurveyConfigsPaginated("tenant-1", { page: 2, pageSize: 10 })

    expect(mockFindConfigsPaginated).toHaveBeenCalledWith("tenant-1", {}, 10, 10)
  })

  it("primeira página usa skip = 0", async () => {
    mockFindConfigsPaginated.mockResolvedValue({ items: [], total: 0 })

    await getClimateSurveyConfigsPaginated("tenant-1", { page: 1, pageSize: 10 })

    expect(mockFindConfigsPaginated).toHaveBeenCalledWith("tenant-1", {}, 0, 10)
  })

  it("repassa filtros opcionais ao repository", async () => {
    mockFindConfigsPaginated.mockResolvedValue({ items: [], total: 0 })

    await getClimateSurveyConfigsPaginated("tenant-1", {
      page: 1,
      pageSize: 5,
      q: "saúde",
      frequency: "weekly",
      departmentId: "dept-1",
    })

    expect(mockFindConfigsPaginated).toHaveBeenCalledWith(
      "tenant-1",
      { q: "saúde", frequency: "weekly", departmentId: "dept-1" },
      0,
      5,
    )
  })

  it("retorna items e total do repository", async () => {
    const fakeItems = [{ id: "cfg-1" }] as Awaited<ReturnType<typeof findClimateSurveyConfigsByTenant>>
    mockFindConfigsPaginated.mockResolvedValue({ items: fakeItems, total: 42 })

    const result = await getClimateSurveyConfigsPaginated("tenant-1", { page: 1, pageSize: 10 })

    expect(result).toEqual({ items: fakeItems, total: 42 })
  })
})

describe("getClimateSurveyConfig", () => {
  it("returns a health survey config by id", async () => {
    mockFindConfig.mockResolvedValue({ id: "cfg-1" } as Awaited<ReturnType<typeof findClimateSurveyConfigById>>)
    const result = await getClimateSurveyConfig("tenant-1", "cfg-1")
    expect(result).toEqual({ id: "cfg-1" })
    expect(mockFindConfig).toHaveBeenCalledWith("tenant-1", "cfg-1")
  })

  it("returns null when not found", async () => {
    mockFindConfig.mockResolvedValue(null)
    const result = await getClimateSurveyConfig("tenant-1", "missing")
    expect(result).toBeNull()
  })
})

describe("getClimateSurveyConfigsWithDepartments", () => {
  it("lista configs com paginação ampla fixa", async () => {
    mockFindConfigsPaginated.mockResolvedValue({ items: [], total: 0 })

    await getClimateSurveyConfigsWithDepartments("tenant-1", { q: "clima" })

    expect(mockFindConfigsPaginated).toHaveBeenCalledWith("tenant-1", { q: "clima" }, 0, 1000)
  })
})

describe("createClimateSurveyForDepartments", () => {
  it("cria uma config para setores explicitamente selecionados via createNewClimateSurveyConfigEntry", async () => {
    mockCreateNewConfig.mockResolvedValue({
      id: "cfg-new",
      questions: [{ id: "q-1", order: 1 }],
    } as Awaited<ReturnType<typeof createNewClimateSurveyConfigEntry>>)

    await createClimateSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-1", "dept-2"],
    })

    expect(mockCreateNewConfig).toHaveBeenCalledOnce()
    expect(mockCreateNewConfig).toHaveBeenCalledWith("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-1", "dept-2"],
    })
  })

  it("cria config para todos os setores quando departmentIds = 'all'", async () => {
    mockFindActiveDepts.mockResolvedValue([
      { id: "dept-a" },
      { id: "dept-b" },
    ] as Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>)
    mockCreateNewConfig.mockResolvedValue({
      id: "cfg-new",
      questions: [{ id: "q-1", order: 1 }],
    } as Awaited<ReturnType<typeof createNewClimateSurveyConfigEntry>>)

    await createClimateSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: "all",
    })

    expect(mockCreateNewConfig).toHaveBeenCalledWith("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-a", "dept-b"],
    })
  })

  it("exclui setores listados em excludeDeptIds ao usar 'all'", async () => {
    mockFindActiveDepts.mockResolvedValue([
      { id: "dept-a" },
      { id: "dept-b" },
      { id: "dept-c" },
    ] as Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>)
    mockCreateNewConfig.mockResolvedValue({
      id: "cfg-new",
      questions: [{ id: "q-1", order: 1 }],
    } as Awaited<ReturnType<typeof createNewClimateSurveyConfigEntry>>)

    await createClimateSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: "all",
      excludeDeptIds: ["dept-a"],
    })

    expect(mockCreateNewConfig).toHaveBeenCalledWith("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-b", "dept-c"],
    })
  })

  it("exclui setores listados em excludeDeptIds ao usar lista explícita", async () => {
    mockCreateNewConfig.mockResolvedValue({
      id: "cfg-new",
      questions: [{ id: "q-1", order: 1 }],
    } as Awaited<ReturnType<typeof createNewClimateSurveyConfigEntry>>)

    await createClimateSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-1", "dept-2", "dept-3"],
      excludeDeptIds: ["dept-2"],
    })

    expect(mockCreateNewConfig).toHaveBeenCalledWith("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-1", "dept-3"],
    })
  })

  it("lança AppError quando não há setores disponíveis para 'all'", async () => {
    mockFindActiveDepts.mockResolvedValue([])

    await expect(
      createClimateSurveyForDepartments("tenant-1", { ...BASE_CONFIG_INPUT, departmentIds: "all" }),
    ).rejects.toMatchObject({ code: "NO_DEPARTMENTS" })
  })

  it("lança AppError quando todos os setores explícitos são excluídos por excludeDeptIds", async () => {
    mockCreateNewConfig.mockResolvedValue({
      id: "cfg-new",
      questions: [{ id: "q-1", order: 1 }],
    } as Awaited<ReturnType<typeof createNewClimateSurveyConfigEntry>>)

    await expect(
      createClimateSurveyForDepartments("tenant-1", {
        ...BASE_CONFIG_INPUT,
        departmentIds: ["dept-1"],
        excludeDeptIds: ["dept-1"],
      }),
    ).rejects.toMatchObject({ code: "NO_DEPARTMENTS" })
  })

  it("lança AppError quando nenhum canal de envio está selecionado", async () => {
    await expect(
      createClimateSurveyForDepartments("tenant-1", {
        ...BASE_CONFIG_INPUT,
        departmentIds: ["dept-1"],
        sendViaMessaging: false,
        sendViaSignedLink: false,
      }),
    ).rejects.toMatchObject({ code: "NO_CHANNELS" })

    expect(mockCreateNewConfig).not.toHaveBeenCalled()
  })
})

describe("updateClimateSurveyConfig", () => {
  it("delega ao repository com os parâmetros corretos", async () => {
    mockUpdateConfig.mockResolvedValue({
      id: "cfg-1",
      questions: [{ id: "q-1", order: 1, isActive: true }],
    } as Awaited<ReturnType<typeof updateExistingClimateSurveyConfigEntry>>)

    await updateClimateSurveyConfig("tenant-1", "cfg-1", BASE_UPDATE_INPUT)

    expect(mockUpdateConfig).toHaveBeenCalledWith("tenant-1", "cfg-1", BASE_UPDATE_INPUT)
  })

  it("lança AppError quando nenhum canal de envio está selecionado", async () => {
    await expect(
      updateClimateSurveyConfig("tenant-1", "cfg-1", {
        ...BASE_UPDATE_INPUT,
        sendViaMessaging: false,
        sendViaSignedLink: false,
      }),
    ).rejects.toMatchObject({ code: "NO_CHANNELS" })

    expect(mockUpdateConfig).not.toHaveBeenCalled()
  })
})

describe("deactivateClimateSurveyConfig", () => {
  it("delega ao repository com os parâmetros corretos", async () => {
    mockDeactivateConfig.mockResolvedValue(undefined)

    await deactivateClimateSurveyConfig("tenant-1", "cfg-1")

    expect(mockDeactivateConfig).toHaveBeenCalledWith("tenant-1", "cfg-1")
  })
})

describe("duplicateClimateSurveyConfig", () => {
  const SOURCE_CONFIG = {
    id: "cfg-1",
    name: "Pesquisa Teste",
    description: null,
    frequency: "weekly",
    scheduledDayOfMonth: null,
    dispatchTime: "09:00",
    respectEmployeeSchedule: false,
    tokenExpiryHours: 48,
    sendViaMessaging: true,
    sendViaSignedLink: false,
    configDepartments: [{ department: { id: "dept-1" } }],
    questions: [
      {
        id: "q-1",
        text: "Pergunta 1",
        order: 1,
        scoreDirection: "higher_is_better",
        dimension: "job_satisfaction",
      },
    ],
    workDays: [{ dayOfWeek: 1 }, { dayOfWeek: 2 }],
  } as NonNullable<Awaited<ReturnType<typeof findClimateSurveyConfigById>>>

  it("copia setores, canais e banco de perguntas para uma nova config", async () => {
    mockFindConfig.mockResolvedValue(SOURCE_CONFIG)
    mockCreateNewConfig.mockResolvedValue({
      id: "cfg-copy",
      questions: [{ id: "q-1", order: 1 }],
    } as Awaited<ReturnType<typeof createNewClimateSurveyConfigEntry>>)

    const newConfigId = await duplicateClimateSurveyConfig("tenant-1", "cfg-1")

    expect(newConfigId).toBe("cfg-copy")
    expect(mockCreateNewConfig).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        name: "Cópia de Pesquisa Teste",
        departmentIds: ["dept-1"],
        sendViaMessaging: true,
        sendViaSignedLink: false,
        workDays: [1, 2],
        questions: [expect.objectContaining({ text: "Pergunta 1", order: 1, dimension: "job_satisfaction" })],
      }),
    )
  })

  it("lança AppError quando a config não existe", async () => {
    mockFindConfig.mockResolvedValue(null)

    await expect(duplicateClimateSurveyConfig("tenant-1", "missing")).rejects.toMatchObject({
      code: "CONFIG_NOT_FOUND",
    })
    expect(mockCreateNewConfig).not.toHaveBeenCalled()
  })

  it("lança AppError quando a config não tem setores", async () => {
    mockFindConfig.mockResolvedValue({ ...SOURCE_CONFIG, configDepartments: [] })

    await expect(duplicateClimateSurveyConfig("tenant-1", "cfg-1")).rejects.toMatchObject({
      code: "NO_DEPARTMENTS",
    })
    expect(mockCreateNewConfig).not.toHaveBeenCalled()
  })
})
