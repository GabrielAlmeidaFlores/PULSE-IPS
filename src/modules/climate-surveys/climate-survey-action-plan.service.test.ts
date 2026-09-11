import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createClimateSurveyActionPlan,
  getClimateSurveyActionPlanBoard,
  updateClimateSurveyActionPlan,
  updateClimateSurveyActionPlanStatus,
} from "@/modules/climate-surveys/climate-survey-action-plan.service"
import {
  countClimateSurveyActionPlanIndicators,
  createActionPlan,
  findActionPlanById,
  findClimateSurveyActionPlans,
  updateActionPlan,
} from "@/modules/action-plans/action-plan.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"
import { getOrgUsers } from "@/modules/auth/invite.service"
import { getClimateSurveyModuleDashboard } from "@/modules/climate-surveys/climate-survey-dashboard.service"
import { findLatestActiveClimateSurveyDispatch } from "@/modules/climate-surveys/climate-survey.repository"

vi.mock("@/modules/action-plans/action-plan.repository")
vi.mock("@/modules/audit/audit.repository")
vi.mock("@/modules/auth/invite.service")
vi.mock("@/modules/climate-surveys/climate-survey-dashboard.service")
vi.mock("@/modules/climate-surveys/climate-survey.repository")
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
  recordClimateSurveyActionCreated: vi.fn(),
  recordClimateSurveyActionCompleted: vi.fn(),
}))
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY: 5,
  },
}))

const mockFindClimateSurveyActionPlans = vi.mocked(findClimateSurveyActionPlans)
const mockCountIndicators = vi.mocked(countClimateSurveyActionPlanIndicators)
const mockCreateActionPlan = vi.mocked(createActionPlan)
const mockUpdateActionPlan = vi.mocked(updateActionPlan)
const mockFindActionPlanById = vi.mocked(findActionPlanById)
const mockCreateAuditLog = vi.mocked(createAuditLog)
const mockGetOrgUsers = vi.mocked(getOrgUsers)
const mockGetDashboard = vi.mocked(getClimateSurveyModuleDashboard)
const mockFindLatestDispatch = vi.mocked(findLatestActiveClimateSurveyDispatch)

const TENANT_ID = "tenant-1"
const ACTOR_ID = "user-1"
const DISPATCH_ID = "dispatch-1"

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateAuditLog.mockResolvedValue(undefined as never)
  mockGetOrgUsers.mockResolvedValue([
    {
      id: "user-1",
      tenantId: TENANT_ID,
      email: "ana@acme.com",
      name: "Ana",
      role: "admin",
      isActive: true,
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as Awaited<ReturnType<typeof getOrgUsers>>)
  mockCountIndicators.mockResolvedValue({ completed: 1, inProgress: 2, overdue: 1 })
  mockFindLatestDispatch.mockResolvedValue({ id: DISPATCH_ID } as Awaited<
    ReturnType<typeof findLatestActiveClimateSurveyDispatch>
  >)
})

describe("getClimateSurveyActionPlanBoard", () => {
  it("lista tópicos abaixo da meta e indicadores", async () => {
    mockGetDashboard.mockResolvedValue({
      wave: {
        id: DISPATCH_ID,
        configName: "Clima Q1",
        scheduledAt: new Date("2026-01-10"),
        dispatchedAt: new Date("2026-01-10"),
        status: "available",
        departmentNames: ["Vendas"],
      },
      kpis: {
        adherencePercent: 80,
        totalResponses: 10,
        totalRecipients: 12,
        favorabilityPercent: 60,
        enps: 10,
        adherenceStatus: "above_goal",
        favorabilityStatus: "attention",
        enpsStatus: "attention",
      },
      corporateGoalPercent: 70,
      minRespondentsPercent: 40,
      requiredRespondents: 5,
      radar: [
        {
          dimension: "leadership_trust",
          label: "Confiança na Liderança",
          scorePercent: 55,
          goalPercent: 70,
          status: "attention",
        },
        {
          dimension: "job_satisfaction",
          label: "Satisfação no Trabalho",
          scorePercent: 80,
          goalPercent: 70,
          status: "above_goal",
        },
      ],
      topicFavorability: [],
      evolution: [],
      enpsBreakdown: { promoters: 0, neutrals: 0, detractors: 0, total: 0, score: null },
      heatmap: { topics: [], departments: [], cells: [] },
      hasEnoughRespondents: true,
      funnel: {
        dispatchId: DISPATCH_ID,
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        openRatePercent: null,
        clickRatePercent: null,
        totalRecipients: 12,
        responseStarts: 0,
        responseCompletions: 0,
        startRatePercent: null,
        completionRatePercent: null,
        averageResponseTimeSeconds: null,
        abandonmentByQuestion: [],
      },
    } as Awaited<ReturnType<typeof getClimateSurveyModuleDashboard>>)

    mockFindClimateSurveyActionPlans.mockResolvedValue([
      {
        id: "plan-1",
        tenantId: TENANT_ID,
        title: "Melhorar liderança",
        description: "Ações de feedback",
        status: "in_progress",
        priority: "high",
        dueDate: new Date("2020-01-01"),
        completedAt: null,
        assigneeId: "user-1",
        climateSurveyDispatchId: DISPATCH_ID,
        climateSurveyDimension: "leadership_trust",
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [],
        assignee: { id: "user-1", name: "Ana" },
        climateSurveyDispatch: {
          id: DISPATCH_ID,
          climateSurveyConfiguration: { name: "Clima Q1" },
        },
      },
    ] as Awaited<ReturnType<typeof findClimateSurveyActionPlans>>)

    const board = await getClimateSurveyActionPlanBoard(TENANT_ID)

    expect(board.belowGoalTopics).toHaveLength(1)
    expect(board.belowGoalTopics[0]?.dimension).toBe("leadership_trust")
    expect(board.belowGoalTopics[0]?.openActionsCount).toBe(1)
    expect(board.actions).toHaveLength(1)
    expect(board.actions[0]?.isOverdue).toBe(true)
    expect(board.indicators.completed).toBe(1)
    expect(board.indicators.inProgress).toBe(2)
    expect(board.indicators.overdue).toBe(1)
    expect(board.assignees[0]?.name).toBe("Ana")
  })

  it("filtra ações por status e responsável", async () => {
    mockGetDashboard.mockResolvedValue({
      wave: null,
      kpis: {
        adherencePercent: null,
        totalResponses: 0,
        totalRecipients: 0,
        favorabilityPercent: null,
        enps: null,
        adherenceStatus: "unavailable",
        favorabilityStatus: "unavailable",
        enpsStatus: "unavailable",
      },
      corporateGoalPercent: 70,
      minRespondentsPercent: 40,
      requiredRespondents: 0,
      radar: [],
      topicFavorability: [],
      evolution: [],
      enpsBreakdown: { promoters: 0, neutrals: 0, detractors: 0, total: 0, score: null },
      heatmap: { topics: [], departments: [], cells: [] },
      hasEnoughRespondents: false,
      funnel: {
        dispatchId: null,
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        openRatePercent: null,
        clickRatePercent: null,
        totalRecipients: 0,
        responseStarts: 0,
        responseCompletions: 0,
        startRatePercent: null,
        completionRatePercent: null,
        averageResponseTimeSeconds: null,
        abandonmentByQuestion: [],
      },
    } as Awaited<ReturnType<typeof getClimateSurveyModuleDashboard>>)

    mockFindClimateSurveyActionPlans.mockResolvedValue([
      {
        id: "plan-1",
        tenantId: TENANT_ID,
        title: "A",
        description: null,
        status: "open",
        priority: "medium",
        dueDate: null,
        completedAt: null,
        assigneeId: "user-1",
        climateSurveyDispatchId: DISPATCH_ID,
        climateSurveyDimension: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [],
        assignee: { id: "user-1", name: "Ana" },
        climateSurveyDispatch: null,
      },
      {
        id: "plan-2",
        tenantId: TENANT_ID,
        title: "B",
        description: null,
        status: "completed",
        priority: "low",
        dueDate: null,
        completedAt: new Date(),
        assigneeId: "user-2",
        climateSurveyDispatchId: DISPATCH_ID,
        climateSurveyDimension: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [],
        assignee: { id: "user-2", name: "Bruno" },
        climateSurveyDispatch: null,
      },
    ] as Awaited<ReturnType<typeof findClimateSurveyActionPlans>>)

    const board = await getClimateSurveyActionPlanBoard(TENANT_ID, {
      status: "open",
      assigneeId: "user-1",
    })

    expect(board.actions).toHaveLength(1)
    expect(board.actions[0]?.id).toBe("plan-1")
  })
})

describe("createClimateSurveyActionPlan", () => {
  it("cria ação vinculada à onda ativa", async () => {
    mockCreateActionPlan.mockResolvedValue({
      id: "plan-new",
      tenantId: TENANT_ID,
      title: "Nova ação",
      description: null,
      status: "open",
      priority: "high",
      dueDate: null,
      completedAt: null,
      assigneeId: "user-1",
      climateSurveyDispatchId: DISPATCH_ID,
      climateSurveyDimension: "leadership_trust",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof createActionPlan>>)

    const plan = await createClimateSurveyActionPlan(
      TENANT_ID,
      {
        title: "Nova ação",
        priority: "high",
        assigneeId: "user-1",
        dimension: "leadership_trust",
      },
      ACTOR_ID,
    )

    expect(plan.id).toBe("plan-new")
    expect(mockCreateActionPlan).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        title: "Nova ação",
        climateSurveyDispatchId: DISPATCH_ID,
        assigneeId: "user-1",
        climateSurveyDimension: "leadership_trust",
      }),
    )
  })

  it("lança AppError quando não há onda para vincular", async () => {
    mockFindLatestDispatch.mockResolvedValue(null)

    await expect(
      createClimateSurveyActionPlan(TENANT_ID, { title: "X", priority: "medium" }),
    ).rejects.toMatchObject({ code: "CLIMATE_SURVEY_DISPATCH_REQUIRED" })
    expect(mockCreateActionPlan).not.toHaveBeenCalled()
  })
})

describe("updateClimateSurveyActionPlan", () => {
  it("atualiza status e marca completedAt", async () => {
    mockFindActionPlanById.mockResolvedValue({
      id: "plan-1",
      tenantId: TENANT_ID,
      title: "A",
      description: null,
      status: "open",
      priority: "medium",
      dueDate: null,
      completedAt: null,
      assigneeId: null,
      climateSurveyDispatchId: DISPATCH_ID,
      climateSurveyDimension: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tasks: [],
    } as Awaited<ReturnType<typeof findActionPlanById>>)
    mockUpdateActionPlan.mockResolvedValue({ count: 1 })

    await updateClimateSurveyActionPlanStatus(TENANT_ID, "plan-1", "completed", ACTOR_ID)

    expect(mockUpdateActionPlan).toHaveBeenCalledWith(
      TENANT_ID,
      "plan-1",
      expect.objectContaining({
        status: "completed",
        completedAt: expect.any(Date) as Date,
      }),
    )
  })

  it("lança AppError quando ação não é de clima", async () => {
    mockFindActionPlanById.mockResolvedValue({
      id: "plan-1",
      tenantId: TENANT_ID,
      title: "A",
      description: null,
      status: "open",
      priority: "medium",
      dueDate: null,
      completedAt: null,
      assigneeId: null,
      climateSurveyDispatchId: null,
      climateSurveyDimension: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tasks: [],
    } as Awaited<ReturnType<typeof findActionPlanById>>)

    await expect(
      updateClimateSurveyActionPlan(TENANT_ID, "plan-1", { title: "Novo" }),
    ).rejects.toMatchObject({ code: "ACTION_PLAN_NOT_FOUND" })
  })
})
