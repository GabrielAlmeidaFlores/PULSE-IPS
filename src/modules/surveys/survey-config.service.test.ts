import { describe, it, expect, vi } from "vitest"
import { getSurveyConfigs, getSurveyConfig, configureSurvey } from "@/modules/surveys/survey-config.service"
import { findSurveyConfigsByTenant, findSurveyConfigById, upsertSurveyConfig } from "@/modules/surveys/survey.repository"

vi.mock("@/modules/surveys/survey.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

const mockFindConfigs = vi.mocked(findSurveyConfigsByTenant)
const mockFindConfig = vi.mocked(findSurveyConfigById)
const mockUpsertConfig = vi.mocked(upsertSurveyConfig)

describe("getSurveyConfigs", () => {
  it("returns all survey configs for the tenant", async () => {
    mockFindConfigs.mockResolvedValue([{ id: "cfg-1" }] as Awaited<ReturnType<typeof findSurveyConfigsByTenant>>)
    const result = await getSurveyConfigs("tenant-1")
    expect(result).toEqual([{ id: "cfg-1" }])
    expect(mockFindConfigs).toHaveBeenCalledWith("tenant-1")
  })
})

describe("getSurveyConfig", () => {
  it("returns a survey config by id", async () => {
    mockFindConfig.mockResolvedValue({ id: "cfg-1" } as Awaited<ReturnType<typeof findSurveyConfigById>>)
    const result = await getSurveyConfig("tenant-1", "cfg-1")
    expect(result).toEqual({ id: "cfg-1" })
    expect(mockFindConfig).toHaveBeenCalledWith("tenant-1", "cfg-1")
  })

  it("returns null when not found", async () => {
    mockFindConfig.mockResolvedValue(null as Awaited<ReturnType<typeof findSurveyConfigById>>)
    const result = await getSurveyConfig("tenant-1", "missing")
    expect(result).toBeNull()
  })
})

describe("configureSurvey", () => {
  it("creates or updates survey configuration and returns result", async () => {
    mockUpsertConfig.mockResolvedValue({ id: "cfg-1" } as Awaited<ReturnType<typeof upsertSurveyConfig>>)
    const input = { departmentId: "dept-1", frequency: "weekly" as const, workStartTime: "09:00", workEndTime: "18:00", workDays: [1, 2, 3, 4, 5], isActive: true, questions: [] }

    const result = await configureSurvey("tenant-1", input)
    expect(result).toEqual({ id: "cfg-1" })
    expect(mockUpsertConfig).toHaveBeenCalledWith("tenant-1", input)
  })
})
