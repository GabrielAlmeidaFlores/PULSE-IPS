import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getHealthSurveyConfigs,
  getHealthSurveyConfig,
  getHealthSurveyConfigsPaginated,
  createHealthSurveyForDepartments,
  updateHealthSurveyConfig,
  deactivateHealthSurveyConfig,
  getHealthSurveyConfigsGrouped,
  getHealthSurveyConfigGroup,
  getHealthSurveyConfigGroupByName,
} from "@/modules/health-surveys/health-survey-config.service"
import {
  findHealthSurveyConfigsByTenant,
  findHealthSurveyConfigsByTenantPaginated,
  findHealthSurveyConfigById,
  findHealthSurveyConfigsByName,
  createManyHealthSurveyConfigEntries,
  updateExistingHealthSurveyConfigEntry,
  deactivateHealthSurveyConfigEntry,
} from "@/modules/health-surveys/health-survey.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"

vi.mock("@/modules/health-surveys/health-survey.repository")
vi.mock("@/modules/departments/department.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindConfigs = vi.mocked(findHealthSurveyConfigsByTenant)
const mockFindConfigsPaginated = vi.mocked(findHealthSurveyConfigsByTenantPaginated)
const mockFindConfig = vi.mocked(findHealthSurveyConfigById)
const mockFindConfigsByName = vi.mocked(findHealthSurveyConfigsByName)
const mockCreateManyConfigs = vi.mocked(createManyHealthSurveyConfigEntries)
const mockUpdateConfig = vi.mocked(updateExistingHealthSurveyConfigEntry)
const mockDeactivateConfig = vi.mocked(deactivateHealthSurveyConfigEntry)
const mockFindActiveDepts = vi.mocked(findActiveDepartmentsByTenant)

type ConfigItem = Awaited<ReturnType<typeof findHealthSurveyConfigsByTenantPaginated>>["items"][number]

function makeConfig(overrides: { id: string; name: string; departmentId?: string; deptId?: string; deptName?: string; deptIsActive?: boolean }): ConfigItem {
  const deptId = overrides.deptId ?? overrides.departmentId ?? `dept-${overrides.id}`
  return {
    id: overrides.id,
    tenantId: "tenant-1",
    name: overrides.name,
    description: null,
    frequency: "weekly",
    scheduledDayOfMonth: null,
    workStartTime: "09:00",
    workEndTime: "18:00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    departmentId: deptId,
    workDays: [{ configId: overrides.id, dayOfWeek: 1 }, { configId: overrides.id, dayOfWeek: 2 }, { configId: overrides.id, dayOfWeek: 3 }, { configId: overrides.id, dayOfWeek: 4 }, { configId: overrides.id, dayOfWeek: 5 }],
    department: {
      id: deptId,
      name: overrides.deptName ?? `Setor ${overrides.id}`,
      isActive: overrides.deptIsActive ?? true,
      tenantId: "tenant-1",
      workStartTime: "09:00",
      workEndTime: "18:00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    questions: [{ id: "q-1", text: "Pergunta 1", order: 1, scoreDirection: "higher_is_better", isActive: true, tenantId: "tenant-1", healthSurveyConfigurationId: overrides.id }],
  } as ConfigItem
}

const SCORE_DIRECTION_HIGHER = "higher_is_better" as const
const QUESTION_TEXT_1 = "Pergunta 1"
const BASE_QUESTIONS = [{ text: QUESTION_TEXT_1, order: 1, scoreDirection: SCORE_DIRECTION_HIGHER }]
const BASE_CONFIG_INPUT = {
  name: "Pesquisa Teste",
  frequency: "weekly" as const,
  scheduledDayOfMonth: null,
  workStartTime: "09:00",
  workEndTime: "18:00",
  workDays: [1, 2, 3, 4, 5],
  questions: BASE_QUESTIONS,
}
const BASE_UPDATE_INPUT = {
  ...BASE_CONFIG_INPUT,
  description: undefined as string | undefined,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getHealthSurveyConfigs", () => {
  it("returns all health survey configs for the tenant", async () => {
    mockFindConfigs.mockResolvedValue([{ id: "cfg-1" }] as Awaited<ReturnType<typeof findHealthSurveyConfigsByTenant>>)
    const result = await getHealthSurveyConfigs("tenant-1")
    expect(result).toEqual([{ id: "cfg-1" }])
    expect(mockFindConfigs).toHaveBeenCalledWith("tenant-1")
  })
})

describe("getHealthSurveyConfigsPaginated", () => {
  it("delega ao repository com skip/take calculados corretamente", async () => {
    mockFindConfigsPaginated.mockResolvedValue({ items: [], total: 0 })

    await getHealthSurveyConfigsPaginated("tenant-1", { page: 2, pageSize: 10 })

    expect(mockFindConfigsPaginated).toHaveBeenCalledWith("tenant-1", {}, 10, 10)
  })

  it("primeira página usa skip = 0", async () => {
    mockFindConfigsPaginated.mockResolvedValue({ items: [], total: 0 })

    await getHealthSurveyConfigsPaginated("tenant-1", { page: 1, pageSize: 10 })

    expect(mockFindConfigsPaginated).toHaveBeenCalledWith("tenant-1", {}, 0, 10)
  })

  it("repassa filtros opcionais ao repository", async () => {
    mockFindConfigsPaginated.mockResolvedValue({ items: [], total: 0 })

    await getHealthSurveyConfigsPaginated("tenant-1", {
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
    const fakeItems = [{ id: "cfg-1" }] as Awaited<ReturnType<typeof findHealthSurveyConfigsByTenant>>
    mockFindConfigsPaginated.mockResolvedValue({ items: fakeItems, total: 42 })

    const result = await getHealthSurveyConfigsPaginated("tenant-1", { page: 1, pageSize: 10 })

    expect(result).toEqual({ items: fakeItems, total: 42 })
  })
})

describe("getHealthSurveyConfig", () => {
  it("returns a health survey config by id", async () => {
    mockFindConfig.mockResolvedValue({ id: "cfg-1" } as Awaited<ReturnType<typeof findHealthSurveyConfigById>>)
    const result = await getHealthSurveyConfig("tenant-1", "cfg-1")
    expect(result).toEqual({ id: "cfg-1" })
    expect(mockFindConfig).toHaveBeenCalledWith("tenant-1", "cfg-1")
  })

  it("returns null when not found", async () => {
    mockFindConfig.mockResolvedValue(null)
    const result = await getHealthSurveyConfig("tenant-1", "missing")
    expect(result).toBeNull()
  })
})

const SURVEY_NAME_SAUDE = "Pesquisa de Saúde"

describe("getHealthSurveyConfigsGrouped", () => {
  it("agrupa configs com mesmo nome em um único grupo", async () => {
    const cfg1 = makeConfig({ id: "cfg-1", name: SURVEY_NAME_SAUDE, deptId: "dept-1", deptName: "Operação" })
    const cfg2 = makeConfig({ id: "cfg-2", name: SURVEY_NAME_SAUDE, deptId: "dept-2", deptName: "Tecnologia" })
    mockFindConfigsPaginated.mockResolvedValue({ items: [cfg1, cfg2], total: 2 })

    const { groups, total } = await getHealthSurveyConfigsGrouped("tenant-1", {})

    expect(groups).toHaveLength(1)
    expect(total).toBe(1)
    expect(groups[0]?.name).toBe(SURVEY_NAME_SAUDE)
    expect(groups[0]?.departments).toHaveLength(2)
    expect(groups[0]?.configIds).toEqual(["cfg-1", "cfg-2"])
  })

  it("cria grupos separados para configs com nomes distintos", async () => {
    const cfg1 = makeConfig({ id: "cfg-1", name: "Pesquisa A", deptId: "dept-1", deptName: "Operação" })
    const cfg2 = makeConfig({ id: "cfg-2", name: "Pesquisa B", deptId: "dept-2", deptName: "Tecnologia" })
    mockFindConfigsPaginated.mockResolvedValue({ items: [cfg1, cfg2], total: 2 })

    const { groups, total } = await getHealthSurveyConfigsGrouped("tenant-1", {})

    expect(groups).toHaveLength(2)
    expect(total).toBe(2)
    expect(groups.map((g) => g.name)).toEqual(["Pesquisa A", "Pesquisa B"])
  })

  it("exclui setores inativos da lista de departamentos do grupo", async () => {
    const cfg1 = makeConfig({ id: "cfg-1", name: SURVEY_NAME_SAUDE, deptId: "dept-1", deptName: "Operação", deptIsActive: true })
    const cfg2 = makeConfig({ id: "cfg-2", name: SURVEY_NAME_SAUDE, deptId: "dept-2", deptName: "Financeiro", deptIsActive: false })
    mockFindConfigsPaginated.mockResolvedValue({ items: [cfg1, cfg2], total: 2 })

    const { groups } = await getHealthSurveyConfigsGrouped("tenant-1", {})

    expect(groups).toHaveLength(1)
    expect(groups[0]?.departments).toHaveLength(1)
    expect(groups[0]?.departments[0]?.name).toBe("Operação")
    expect(groups[0]?.configIds).toHaveLength(2)
  })

  it("grupo com único config de setor inativo tem departments vazio mas configIds com 1 item", async () => {
    const cfg1 = makeConfig({ id: "cfg-1", name: SURVEY_NAME_SAUDE, deptId: "dept-1", deptName: "Financeiro", deptIsActive: false })
    mockFindConfigsPaginated.mockResolvedValue({ items: [cfg1], total: 1 })

    const { groups, total } = await getHealthSurveyConfigsGrouped("tenant-1", {})

    expect(groups).toHaveLength(1)
    expect(total).toBe(1)
    expect(groups[0]?.departments).toHaveLength(0)
    expect(groups[0]?.configIds).toHaveLength(1)
  })

  it("retorna grupos vazios quando não há configs", async () => {
    mockFindConfigsPaginated.mockResolvedValue({ items: [], total: 0 })

    const { groups, total } = await getHealthSurveyConfigsGrouped("tenant-1", {})

    expect(groups).toHaveLength(0)
    expect(total).toBe(0)
  })

  it("extrai workDays corretamente como array de números", async () => {
    const cfg1 = makeConfig({ id: "cfg-1", name: SURVEY_NAME_SAUDE, deptId: "dept-1" })
    mockFindConfigsPaginated.mockResolvedValue({ items: [cfg1], total: 1 })

    const { groups } = await getHealthSurveyConfigsGrouped("tenant-1", {})

    expect(groups[0]?.workDays).toEqual([1, 2, 3, 4, 5])
  })

  it("usa o id do primeiro config encontrado como id do grupo", async () => {
    const cfg1 = makeConfig({ id: "cfg-first", name: SURVEY_NAME_SAUDE, deptId: "dept-1" })
    const cfg2 = makeConfig({ id: "cfg-second", name: SURVEY_NAME_SAUDE, deptId: "dept-2" })
    mockFindConfigsPaginated.mockResolvedValue({ items: [cfg1, cfg2], total: 2 })

    const { groups } = await getHealthSurveyConfigsGrouped("tenant-1", {})

    expect(groups[0]?.id).toBe("cfg-first")
  })

  it("repassa filtros ao repository", async () => {
    mockFindConfigsPaginated.mockResolvedValue({ items: [], total: 0 })

    await getHealthSurveyConfigsGrouped("tenant-1", { q: "saúde", frequency: "weekly", departmentId: "dept-1" })

    expect(mockFindConfigsPaginated).toHaveBeenCalledWith("tenant-1", { q: "saúde", frequency: "weekly", departmentId: "dept-1" }, 0, 1000)
  })
})

describe("getHealthSurveyConfigGroup", () => {
  it("retorna null quando config não encontrada", async () => {
    mockFindConfig.mockResolvedValue(null)

    const result = await getHealthSurveyConfigGroup("tenant-1", "not-found")

    expect(result).toBeNull()
    expect(mockFindConfigsByName).not.toHaveBeenCalled()
  })

  it("retorna representative e allDeptIds do grupo", async () => {
    const cfg = makeConfig({ id: "cfg-1", name: SURVEY_NAME_SAUDE, deptId: "dept-1" })
    const sibling = makeConfig({ id: "cfg-2", name: SURVEY_NAME_SAUDE, deptId: "dept-2" })
    mockFindConfig.mockResolvedValue(cfg as Awaited<ReturnType<typeof findHealthSurveyConfigById>>)
    mockFindConfigsByName.mockResolvedValue([cfg, sibling] as Awaited<ReturnType<typeof findHealthSurveyConfigsByName>>)

    const result = await getHealthSurveyConfigGroup("tenant-1", "cfg-1")

    expect(result).not.toBeNull()
    if (result === null) return
    expect(result.representative.id).toBe("cfg-1")
    expect(result.allDeptIds).toEqual(["dept-1", "dept-2"])
  })

  it("allDeptIds contém apenas os deptIds dos irmãos ativos (findHealthSurveyConfigsByName filtra isActive)", async () => {
    const cfg = makeConfig({ id: "cfg-1", name: SURVEY_NAME_SAUDE, deptId: "dept-1" })
    mockFindConfig.mockResolvedValue(cfg as Awaited<ReturnType<typeof findHealthSurveyConfigById>>)
    mockFindConfigsByName.mockResolvedValue([cfg] as Awaited<ReturnType<typeof findHealthSurveyConfigsByName>>)

    const result = await getHealthSurveyConfigGroup("tenant-1", "cfg-1")

    expect(result?.allDeptIds).toEqual(["dept-1"])
  })

  it("busca irmãos pelo nome da config representativa", async () => {
    const cfg = makeConfig({ id: "cfg-1", name: "Minha Pesquisa", deptId: "dept-1" })
    mockFindConfig.mockResolvedValue(cfg as Awaited<ReturnType<typeof findHealthSurveyConfigById>>)
    mockFindConfigsByName.mockResolvedValue([cfg] as Awaited<ReturnType<typeof findHealthSurveyConfigsByName>>)

    await getHealthSurveyConfigGroup("tenant-1", "cfg-1")

    expect(mockFindConfigsByName).toHaveBeenCalledWith("tenant-1", "Minha Pesquisa")
  })
})

describe("getHealthSurveyConfigGroupByName", () => {
  it("delega ao repository findHealthSurveyConfigsByName", async () => {
    const cfg = makeConfig({ id: "cfg-1", name: SURVEY_NAME_SAUDE, deptId: "dept-1" })
    mockFindConfigsByName.mockResolvedValue([cfg] as Awaited<ReturnType<typeof findHealthSurveyConfigsByName>>)

    const result = await getHealthSurveyConfigGroupByName("tenant-1", SURVEY_NAME_SAUDE)

    expect(mockFindConfigsByName).toHaveBeenCalledWith("tenant-1", SURVEY_NAME_SAUDE)
    expect(result).toHaveLength(1)
  })
})

describe("createHealthSurveyForDepartments", () => {
  it("cria configs para setores explicitamente selecionados via createManyHealthSurveyConfigEntries", async () => {
    mockCreateManyConfigs.mockResolvedValue(undefined)

    await createHealthSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-1", "dept-2"],
    })

    expect(mockCreateManyConfigs).toHaveBeenCalledOnce()
    expect(mockCreateManyConfigs).toHaveBeenCalledWith("tenant-1", [
      { ...BASE_CONFIG_INPUT, departmentId: "dept-1" },
      { ...BASE_CONFIG_INPUT, departmentId: "dept-2" },
    ])
  })

  it("cria configs para todos os setores quando departmentIds = 'all'", async () => {
    mockFindActiveDepts.mockResolvedValue([
      { id: "dept-a" },
      { id: "dept-b" },
    ] as Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>)
    mockCreateManyConfigs.mockResolvedValue(undefined)

    await createHealthSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: "all",
    })

    expect(mockCreateManyConfigs).toHaveBeenCalledWith("tenant-1", [
      { ...BASE_CONFIG_INPUT, departmentId: "dept-a" },
      { ...BASE_CONFIG_INPUT, departmentId: "dept-b" },
    ])
  })

  it("exclui setores listados em excludeDeptIds ao usar 'all'", async () => {
    mockFindActiveDepts.mockResolvedValue([
      { id: "dept-a" },
      { id: "dept-b" },
      { id: "dept-c" },
    ] as Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>)
    mockCreateManyConfigs.mockResolvedValue(undefined)

    await createHealthSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: "all",
      excludeDeptIds: ["dept-a"],
    })

    expect(mockCreateManyConfigs).toHaveBeenCalledWith("tenant-1", [
      { ...BASE_CONFIG_INPUT, departmentId: "dept-b" },
      { ...BASE_CONFIG_INPUT, departmentId: "dept-c" },
    ])
  })

  it("exclui setores listados em excludeDeptIds ao usar lista explícita", async () => {
    mockCreateManyConfigs.mockResolvedValue(undefined)

    await createHealthSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-1", "dept-2", "dept-3"],
      excludeDeptIds: ["dept-2"],
    })

    expect(mockCreateManyConfigs).toHaveBeenCalledWith("tenant-1", [
      { ...BASE_CONFIG_INPUT, departmentId: "dept-1" },
      { ...BASE_CONFIG_INPUT, departmentId: "dept-3" },
    ])
  })

  it("lança AppError quando não há setores disponíveis para 'all'", async () => {
    mockFindActiveDepts.mockResolvedValue([])

    await expect(
      createHealthSurveyForDepartments("tenant-1", { ...BASE_CONFIG_INPUT, departmentIds: "all" }),
    ).rejects.toMatchObject({ code: "NO_DEPARTMENTS" })
  })

  it("lança AppError quando todos os setores explícitos são excluídos por excludeDeptIds", async () => {
    mockCreateManyConfigs.mockResolvedValue(undefined)

    await expect(
      createHealthSurveyForDepartments("tenant-1", {
        ...BASE_CONFIG_INPUT,
        departmentIds: ["dept-1"],
        excludeDeptIds: ["dept-1"],
      }),
    ).rejects.toMatchObject({ code: "NO_DEPARTMENTS" })
  })

  it("cria config mesmo para setores que já possuem outra configuração ativa", async () => {
    mockCreateManyConfigs.mockResolvedValue(undefined)

    await createHealthSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-1", "dept-2"],
    })

    expect(mockCreateManyConfigs).toHaveBeenCalledWith("tenant-1", [
      { ...BASE_CONFIG_INPUT, departmentId: "dept-1" },
      { ...BASE_CONFIG_INPUT, departmentId: "dept-2" },
    ])
  })
})

describe("updateHealthSurveyConfig", () => {
  it("delega ao repository com os parâmetros corretos", async () => {
    mockUpdateConfig.mockResolvedValue({ id: "cfg-1" } as Awaited<ReturnType<typeof updateExistingHealthSurveyConfigEntry>>)

    await updateHealthSurveyConfig("tenant-1", "cfg-1", BASE_UPDATE_INPUT)

    expect(mockUpdateConfig).toHaveBeenCalledWith("tenant-1", "cfg-1", BASE_UPDATE_INPUT)
  })
})

describe("deactivateHealthSurveyConfig", () => {
  it("delega ao repository com os parâmetros corretos", async () => {
    mockDeactivateConfig.mockResolvedValue(undefined)

    await deactivateHealthSurveyConfig("tenant-1", "cfg-1")

    expect(mockDeactivateConfig).toHaveBeenCalledWith("tenant-1", "cfg-1")
  })
})
