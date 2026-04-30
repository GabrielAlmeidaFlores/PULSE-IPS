import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getHealthSurveyConfigs,
  getHealthSurveyConfig,
  configureHealthSurvey,
  getGlobalHealthSurveyConfig,
  configureHealthSurveyForAllDepartments,
} from "@/modules/health-surveys/health-survey-config.service"
import {
  findHealthSurveyConfigsByTenant,
  findHealthSurveyConfigById,
  findFirstHealthSurveyConfigByTenant,
  upsertHealthSurveyConfig,
} from "@/modules/health-surveys/health-survey.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"

vi.mock("@/modules/health-surveys/health-survey.repository")
vi.mock("@/modules/departments/department.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindConfigs = vi.mocked(findHealthSurveyConfigsByTenant)
const mockFindConfig = vi.mocked(findHealthSurveyConfigById)
const mockFindFirstConfig = vi.mocked(findFirstHealthSurveyConfigByTenant)
const mockUpsertConfig = vi.mocked(upsertHealthSurveyConfig)
const mockFindActiveDepts = vi.mocked(findActiveDepartmentsByTenant)

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

describe("configureHealthSurvey", () => {
  it("creates or updates health survey configuration and returns result", async () => {
    mockUpsertConfig.mockResolvedValue({ id: "cfg-1" } as Awaited<ReturnType<typeof upsertHealthSurveyConfig>>)
    const input = { departmentId: "dept-1", frequency: "weekly" as const, workStartTime: "09:00", workEndTime: "18:00", workDays: [1, 2, 3, 4, 5], isActive: true, questions: [] }

    const result = await configureHealthSurvey("tenant-1", input)
    expect(result).toEqual({ id: "cfg-1" })
    expect(mockUpsertConfig).toHaveBeenCalledWith("tenant-1", input)
  })
})

describe("getGlobalHealthSurveyConfig", () => {
  it("returns null when no config exists", async () => {
    mockFindFirstConfig.mockResolvedValue(null)
    const result = await getGlobalHealthSurveyConfig("tenant-1")
    expect(result).toBeNull()
  })

  it("returns mapped config when a config exists", async () => {
    mockFindFirstConfig.mockResolvedValue({
      id: "cfg-1",
      frequency: "weekly",
      workStartTime: "09:00",
      workEndTime: "18:00",
      workDays: [{ dayOfWeek: 1 }, { dayOfWeek: 5 }],
      questions: [{ id: "q-1", text: "Pergunta 1", order: 1, scoreDirection: "higher_is_better", isActive: true, tenantId: "tenant-1", healthSurveyConfigurationId: "cfg-1" }],
    } as Awaited<ReturnType<typeof findFirstHealthSurveyConfigByTenant>>)

    const result = await getGlobalHealthSurveyConfig("tenant-1")
    expect(result).toMatchObject({
      frequency: "weekly",
      workStartTime: "09:00",
      workEndTime: "18:00",
      workDays: [1, 5],
      questions: [{ id: "q-1", text: "Pergunta 1", order: 1, scoreDirection: "higher_is_better" }],
    })
  })
})

describe("configureHealthSurveyForAllDepartments", () => {
  const globalInput = {
    frequency: "weekly" as const,
    workStartTime: "09:00",
    workEndTime: "18:00",
    workDays: [1, 2, 3, 4, 5],
    questions: [{ text: "Pergunta 1", order: 1, scoreDirection: "higher_is_better" as const }],
  }

  it("calls upsertHealthSurveyConfig for each active department", async () => {
    mockFindActiveDepts.mockResolvedValue([
      { id: "dept-1" },
      { id: "dept-2" },
    ] as Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>)
    mockUpsertConfig.mockResolvedValue({ id: "cfg-1" } as Awaited<ReturnType<typeof upsertHealthSurveyConfig>>)

    await configureHealthSurveyForAllDepartments("tenant-1", globalInput)

    expect(mockUpsertConfig).toHaveBeenCalledTimes(2)
    expect(mockUpsertConfig).toHaveBeenCalledWith("tenant-1", { ...globalInput, departmentId: "dept-1" })
    expect(mockUpsertConfig).toHaveBeenCalledWith("tenant-1", { ...globalInput, departmentId: "dept-2" })
  })

  it("does not call upsertHealthSurveyConfig when there are no active departments", async () => {
    mockFindActiveDepts.mockResolvedValue([])
    await configureHealthSurveyForAllDepartments("tenant-1", globalInput)
    expect(mockUpsertConfig).not.toHaveBeenCalled()
  })
})
