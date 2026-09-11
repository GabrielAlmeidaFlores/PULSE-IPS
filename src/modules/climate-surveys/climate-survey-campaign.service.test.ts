import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getClimateSurveyCampaignSetup,
  launchClimateSurveyCampaign,
} from "@/modules/climate-surveys/climate-survey-campaign.service"
import {
  countActiveEmployeesGroupedByDepartment,
  createClimateSurveyDispatch,
  findClimateSurveyConfigById,
  findClimateSurveyConfigsByTenant,
  updateClimateSurveyConfigCampaignSettings,
} from "@/modules/climate-surveys/climate-survey.repository"
import { findActiveDepartmentsByTenant } from "@/modules/departments/department.repository"
import { findOrganizationById } from "@/modules/organizations/organization.repository"
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"
import type { Organization } from "@/modules/organizations/organization.types"

vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/departments/department.repository")
vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/modules/billing/billing.service")
vi.mock("@/env", () => ({
  env: {
    SURVEY_MESSAGE_TEMPLATE: "Oi {nome}! Responda: {link}",
  },
}))

const mockFindConfigs = vi.mocked(findClimateSurveyConfigsByTenant)
const mockFindDepartments = vi.mocked(findActiveDepartmentsByTenant)
const mockCountEmployees = vi.mocked(countActiveEmployeesGroupedByDepartment)
const mockHasFeature = vi.mocked(hasTenantPlanFeature)
const mockFindConfigById = vi.mocked(findClimateSurveyConfigById)
const mockUpdateCampaignSettings = vi.mocked(updateClimateSurveyConfigCampaignSettings)
const mockCreateDispatch = vi.mocked(createClimateSurveyDispatch)
const mockFindOrganization = vi.mocked(findOrganizationById)

const TENANT_ID = "tenant-1"
const CONFIG_ID = "11111111-1111-1111-1111-111111111111"
const DEPT_ID = "22222222-2222-2222-2222-222222222222"

function makeOrganization(): Organization {
  return {
    id: TENANT_ID,
    name: "Acme",
    slug: "acme",
    cnpj: null,
    planId: null,
    externalCustomerId: null,
    billingStatus: "active",
    maxEmployeesOverride: null,
    climateSurveyMinRespondentsPercent: 40,
    timezone: "America/Sao_Paulo",
    trialExpiresAt: null,
    isActive: true,
    deletionScheduledAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockHasFeature.mockResolvedValue(true)
  mockUpdateCampaignSettings.mockResolvedValue(undefined)
  mockCreateDispatch.mockResolvedValue({ id: "dispatch-1" } as Awaited<ReturnType<typeof createClimateSurveyDispatch>>)
  mockFindOrganization.mockResolvedValue(makeOrganization())
})

describe("getClimateSurveyCampaignSetup", () => {
  it("retorna configs, departamentos e template de mensagem", async () => {
    mockFindConfigs.mockResolvedValue([
      {
        id: CONFIG_ID,
        name: "Clima Q3",
        frequency: "once",
        sendViaMessaging: true,
        sendViaSignedLink: true,
        tokenExpiryHours: 48,
        configDepartments: [{ department: { id: DEPT_ID, name: "Vendas" } }],
      },
    ] as Awaited<ReturnType<typeof findClimateSurveyConfigsByTenant>>)
    mockFindDepartments.mockResolvedValue([
      { id: DEPT_ID, name: "Vendas" },
    ] as Awaited<ReturnType<typeof findActiveDepartmentsByTenant>>)
    mockCountEmployees.mockResolvedValue(new Map([[DEPT_ID, 12]]))

    const result = await getClimateSurveyCampaignSetup(TENANT_ID)

    expect(result.configs).toHaveLength(1)
    expect(result.departments[0]).toMatchObject({ id: DEPT_ID, employeeCount: 12 })
    expect(result.messageTemplate).toContain("{nome}")
    expect(result.hasMessagingFeature).toBe(true)
  })
})

describe("launchClimateSurveyCampaign", () => {
  it("lança AppError sem canais", async () => {
    await expect(
      launchClimateSurveyCampaign(TENANT_ID, {
        configId: CONFIG_ID,
        sendViaMessaging: false,
        sendViaSignedLink: false,
        frequency: "once",
        timingMode: "now",
        scheduledAt: new Date(),
        departmentIds: [DEPT_ID],
      }),
    ).rejects.toMatchObject({ code: "NO_CHANNELS" })
  })

  it("lança AppError sem departamentos", async () => {
    await expect(
      launchClimateSurveyCampaign(TENANT_ID, {
        configId: CONFIG_ID,
        sendViaMessaging: true,
        sendViaSignedLink: true,
        frequency: "once",
        timingMode: "now",
        scheduledAt: new Date(),
        departmentIds: [],
      }),
    ).rejects.toMatchObject({ code: "NO_DEPARTMENTS" })
  })

  it("atualiza campanha e cria dispatch", async () => {
    mockFindConfigById.mockResolvedValue({
      id: CONFIG_ID,
      tokenExpiryHours: 48,
    } as Awaited<ReturnType<typeof findClimateSurveyConfigById>>)

    const result = await launchClimateSurveyCampaign(TENANT_ID, {
      configId: CONFIG_ID,
      sendViaMessaging: true,
      sendViaSignedLink: true,
      frequency: "quarterly",
      timingMode: "reminder_48h",
      scheduledAt: new Date("2026-08-12T12:00:00.000Z"),
      departmentIds: [DEPT_ID],
    })

    expect(mockUpdateCampaignSettings).toHaveBeenCalledWith(
      TENANT_ID,
      CONFIG_ID,
      expect.objectContaining({
        frequency: "quarterly",
        tokenExpiryHours: 96,
        departmentIds: [DEPT_ID],
      }),
    )
    expect(mockCreateDispatch).toHaveBeenCalled()
    expect(result.dispatchId).toBe("dispatch-1")
  })

  it("define o dia do mês a partir da data quando a recorrência é mensal", async () => {
    mockFindConfigById.mockResolvedValue({
      id: CONFIG_ID,
      tokenExpiryHours: 48,
    } as Awaited<ReturnType<typeof findClimateSurveyConfigById>>)

    await launchClimateSurveyCampaign(TENANT_ID, {
      configId: CONFIG_ID,
      sendViaMessaging: true,
      sendViaSignedLink: false,
      frequency: "monthly",
      timingMode: "schedule",
      scheduledAt: new Date("2026-08-12T12:00:00.000Z"),
      departmentIds: [DEPT_ID],
    })

    expect(mockUpdateCampaignSettings).toHaveBeenCalledWith(
      TENANT_ID,
      CONFIG_ID,
      expect.objectContaining({ frequency: "monthly", scheduledDayOfMonth: 12 }),
    )
  })

  it("limita o dia do mês a 28 na recorrência mensal", async () => {
    mockFindConfigById.mockResolvedValue({
      id: CONFIG_ID,
      tokenExpiryHours: 48,
    } as Awaited<ReturnType<typeof findClimateSurveyConfigById>>)

    await launchClimateSurveyCampaign(TENANT_ID, {
      configId: CONFIG_ID,
      sendViaMessaging: true,
      sendViaSignedLink: false,
      frequency: "monthly",
      timingMode: "schedule",
      scheduledAt: new Date("2026-08-31T12:00:00.000Z"),
      departmentIds: [DEPT_ID],
    })

    expect(mockUpdateCampaignSettings).toHaveBeenCalledWith(
      TENANT_ID,
      CONFIG_ID,
      expect.objectContaining({ scheduledDayOfMonth: 28 }),
    )
  })

  it("não define dia do mês quando a recorrência não é mensal", async () => {
    mockFindConfigById.mockResolvedValue({
      id: CONFIG_ID,
      tokenExpiryHours: 48,
    } as Awaited<ReturnType<typeof findClimateSurveyConfigById>>)

    await launchClimateSurveyCampaign(TENANT_ID, {
      configId: CONFIG_ID,
      sendViaMessaging: true,
      sendViaSignedLink: false,
      frequency: "quarterly",
      timingMode: "now",
      scheduledAt: new Date("2026-08-12T12:00:00.000Z"),
      departmentIds: [DEPT_ID],
    })

    expect(mockUpdateCampaignSettings).toHaveBeenCalledWith(
      TENANT_ID,
      CONFIG_ID,
      expect.objectContaining({ scheduledDayOfMonth: null }),
    )
  })
})
