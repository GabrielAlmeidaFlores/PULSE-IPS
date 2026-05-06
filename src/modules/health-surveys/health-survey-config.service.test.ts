import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getHealthSurveyConfigs,
  getHealthSurveyConfig,
  createHealthSurveyForDepartments,
  updateHealthSurveyConfig,
  deactivateHealthSurveyConfig,
} from "@/modules/health-surveys/health-survey-config.service"
import {
  findHealthSurveyConfigsByTenant,
  findHealthSurveyConfigById,
  createNewHealthSurveyConfigEntry,
  updateExistingHealthSurveyConfigEntry,
  deactivateHealthSurveyConfigEntry,
} from "@/modules/health-surveys/health-survey.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"

vi.mock("@/modules/health-surveys/health-survey.repository")
vi.mock("@/modules/departments/department.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindConfigs = vi.mocked(findHealthSurveyConfigsByTenant)
const mockFindConfig = vi.mocked(findHealthSurveyConfigById)
const mockCreateNewConfig = vi.mocked(createNewHealthSurveyConfigEntry)
const mockUpdateConfig = vi.mocked(updateExistingHealthSurveyConfigEntry)
const mockDeactivateConfig = vi.mocked(deactivateHealthSurveyConfigEntry)
const mockFindActiveDepts = vi.mocked(findActiveDepartmentsByTenant)

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

describe("createHealthSurveyForDepartments", () => {
  it("cria uma config por setor explicitamente selecionado", async () => {
    mockCreateNewConfig.mockResolvedValue({ id: "cfg-1" } as Awaited<ReturnType<typeof createNewHealthSurveyConfigEntry>>)

    await createHealthSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: ["dept-1", "dept-2"],
    })

    expect(mockCreateNewConfig).toHaveBeenCalledTimes(2)
    expect(mockCreateNewConfig).toHaveBeenCalledWith("tenant-1", { ...BASE_CONFIG_INPUT, departmentId: "dept-1" })
    expect(mockCreateNewConfig).toHaveBeenCalledWith("tenant-1", { ...BASE_CONFIG_INPUT, departmentId: "dept-2" })
  })

  it("cria uma config para todos os setores quando departmentIds = 'all'", async () => {
    mockFindActiveDepts.mockResolvedValue([
      { id: "dept-a" },
      { id: "dept-b" },
    ] as Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>)
    mockCreateNewConfig.mockResolvedValue({ id: "cfg-1" } as Awaited<ReturnType<typeof createNewHealthSurveyConfigEntry>>)

    await createHealthSurveyForDepartments("tenant-1", {
      ...BASE_CONFIG_INPUT,
      departmentIds: "all",
    })

    expect(mockCreateNewConfig).toHaveBeenCalledTimes(2)
    expect(mockCreateNewConfig).toHaveBeenCalledWith("tenant-1", { ...BASE_CONFIG_INPUT, departmentId: "dept-a" })
    expect(mockCreateNewConfig).toHaveBeenCalledWith("tenant-1", { ...BASE_CONFIG_INPUT, departmentId: "dept-b" })
  })

  it("lança AppError quando não há setores disponíveis para 'all'", async () => {
    mockFindActiveDepts.mockResolvedValue([])

    await expect(
      createHealthSurveyForDepartments("tenant-1", { ...BASE_CONFIG_INPUT, departmentIds: "all" }),
    ).rejects.toMatchObject({ code: "NO_DEPARTMENTS" })
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
