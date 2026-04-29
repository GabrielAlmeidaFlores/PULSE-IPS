import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  validateHealthSurveyToken,
  submitHealthSurveyResponse,
  cleanupExpiredHealthSurveyTokens,
} from "@/modules/health-surveys/health-survey-response.service"
import {
  findHealthSurveyTokenByValue,
  deleteAllTenantsExpiredHealthSurveyTokens,
  createHealthSurveyResponseWithItems,
} from "@/modules/health-surveys/health-survey.repository"
import {
  getCurrentConsent,
  getActiveConsentTermVersion,
  type ConsentWithTermVersion,
} from "@/modules/consent/consent.repository"
import type { ConsentTermVersion } from "@prisma/client"

vi.mock("@/modules/health-surveys/health-survey.repository")
vi.mock("@/modules/consent/consent.repository")

const mockFormatFn = vi.hoisted(() => vi.fn(() => "12:00"))

vi.mock("date-fns-tz", () => ({
  toZonedTime: vi.fn((date: Date) => date),
}))
vi.mock("date-fns", () => ({
  format: mockFormatFn,
}))

const mockFindToken = vi.mocked(findHealthSurveyTokenByValue)
const mockDeleteExpiredTokens = vi.mocked(deleteAllTenantsExpiredHealthSurveyTokens)
const mockCreateResponse = vi.mocked(createHealthSurveyResponseWithItems)
const mockGetCurrentConsent = vi.mocked(getCurrentConsent)
const mockGetActiveConsentTermVersion = vi.mocked(getActiveConsentTermVersion)

const TOKEN_VALUE = "token-abc-123"
const WORK_HOUR_MIDDAY = "12:00"
const TENANT_ID = "tenant-1"
const EMPLOYEE_ID = "employee-1"
const DISPATCH_ID = "dispatch-1"
const CONFIG_ID = "config-1"

type TokenRecord = NonNullable<Awaited<ReturnType<typeof findHealthSurveyTokenByValue>>>

function makeTokenRecord(overrides?: Partial<TokenRecord>): TokenRecord {
  const base: TokenRecord = {
    id: "token-1",
    tenantId: TENANT_ID,
    employeeId: EMPLOYEE_ID,
    dispatchId: DISPATCH_ID,
    token: TOKEN_VALUE,
    usedAt: null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    workStartTime: "09:00",
    workEndTime: "18:00",
    createdAt: new Date("2024-01-15T09:00:00Z"),
    employee: {
      id: EMPLOYEE_ID,
      tenantId: TENANT_ID,
      departmentId: "dept-1",
      name: "Ana Silva",
      email: null,
      phone: "+5511999999999",
      workStartTime: null,
      workEndTime: null,
      status: "active",
      pauseStartAt: null,
      pauseEndAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    dispatch: {
      id: DISPATCH_ID,
      tenantId: TENANT_ID,
      healthSurveyConfigurationId: CONFIG_ID,
      scheduledAt: new Date(),
      dispatchedAt: new Date(),
      status: "sent",
      totalRecipients: 10,
      totalResponses: 0,
      adherenceCheckedAt: null,
      createdAt: new Date(),
      healthSurveyConfiguration: {
        id: CONFIG_ID,
        tenantId: TENANT_ID,
        departmentId: "dept-1",
        frequency: "weekly",
        workStartTime: "09:00",
        workEndTime: "18:00",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [
          {
            id: "question-1",
            tenantId: TENANT_ID,
            healthSurveyConfigurationId: CONFIG_ID,
            text: "Como você se sente hoje?",
            order: 1,
            scoreDirection: "higher_is_better",
            isActive: true,
          },
        ],
        organization: {
          id: TENANT_ID,
          slug: "acme",
          name: "Acme Corp",
          planId: null,
          externalCustomerId: null,
          timezone: "America/Sao_Paulo",
          billingStatus: "active",
          maxEmployeesOverride: null,
          isActive: true,
          deletionScheduledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    },
    ...overrides,
  }
  return base
}

const ACTIVE_TERM: ConsentTermVersion = {
  id: "term-1",
  version: "1.0.0",
  content: "<p>Termos</p>",
  contentHash: "hash-abc",
  isActive: true,
  createdAt: new Date(),
}

const ACCEPTED_CONSENT: ConsentWithTermVersion = {
  id: "consent-1",
  tenantId: TENANT_ID,
  employeeId: EMPLOYEE_ID,
  consentTermVersionId: "term-1",
  event: "accepted",
  source: "sms_link",
  cpfHash: null,
  token: null,
  tokenExpiresAt: null,
  createdAt: new Date(),
  consentTermVersion: ACTIVE_TERM,
}

const SUBMIT_INPUT = {
  token: TOKEN_VALUE,
  answers: [{ questionId: "question-1", score: 4 }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFormatFn.mockReturnValue(WORK_HOUR_MIDDAY)
  mockFindToken.mockResolvedValue(makeTokenRecord())
  mockGetCurrentConsent.mockResolvedValue(ACCEPTED_CONSENT)
  mockGetActiveConsentTermVersion.mockResolvedValue(ACTIVE_TERM)
  mockCreateResponse.mockResolvedValue(undefined)
  mockDeleteExpiredTokens.mockResolvedValue({ count: 5 })
})

describe("validateHealthSurveyToken — guards de entrada", () => {
  it("retorna inválido quando o token não existe", async () => {
    mockFindToken.mockResolvedValue(null)

    const result = await validateHealthSurveyToken("inexistente")

    expect(result).toEqual({ valid: false, error: "Link inválido ou expirado." })
  })

  it("retorna inválido quando o token já foi usado", async () => {
    mockFindToken.mockResolvedValue(makeTokenRecord({ usedAt: new Date() }))

    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result).toEqual({ valid: false, error: "Esta pesquisa já foi respondida." })
  })

  it("retorna inválido quando o token está expirado", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ expiresAt: new Date(Date.now() - 1000) }),
    )

    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result).toEqual({ valid: false, error: "Este link expirou." })
  })

  it("retorna inválido quando fora da janela de trabalho", async () => {
    mockFormatFn.mockReturnValue("22:00")

    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result).toEqual({
      valid: false,
      error: "Pesquisa disponível apenas no horário de trabalho.",
    })
  })

  it("retorna inválido quando o dispatch não está com status 'sent'", async () => {
    const base = makeTokenRecord()
    mockFindToken.mockResolvedValue(
      makeTokenRecord({
        dispatch: { ...base.dispatch, status: "scheduled" },
      }),
    )

    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result).toEqual({ valid: false, error: "Esta pesquisa não está ativa." })
  })
})

describe("validateHealthSurveyToken — token válido", () => {
  it("retorna válido com consentStatus 'accepted' quando o colaborador aceitou a versão ativa", async () => {
    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.consentStatus).toBe("accepted")
    expect(result.employeeName).toBe("Ana Silva")
    expect(result.questions).toHaveLength(1)
    expect(result.questions[0]?.text).toBe("Como você se sente hoje?")
    expect(result.consentTermContent).toBeNull()
  })

  it("retorna válido com consentStatus 'needs_consent' quando não há consentimento registrado", async () => {
    mockGetCurrentConsent.mockResolvedValue(null)

    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.consentStatus).toBe("needs_consent")
    expect(result.consentTermContent).toBe("<p>Termos</p>")
    expect(result.consentTermVersionId).toBe("term-1")
  })

  it("retorna válido com consentStatus 'needs_consent' quando a versão aceita difere da versão ativa", async () => {
    mockGetCurrentConsent.mockResolvedValue({
      ...ACCEPTED_CONSENT,
      consentTermVersionId: "term-antiga",
    })

    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.consentStatus).toBe("needs_consent")
  })

  it("retorna o timezone da organização no resultado", async () => {
    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.timezone).toBe("America/Sao_Paulo")
  })

  it("inclui os dados do token no resultado para controle do formulário", async () => {
    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.token).toEqual({
      id: "token-1",
      dispatchId: DISPATCH_ID,
      workStartTime: "09:00",
      workEndTime: "18:00",
      tenantId: TENANT_ID,
    })
  })
})

describe("validateHealthSurveyToken — janela de trabalho noturna", () => {
  it("considera válido às 23:30 em um turno noturno que cruza meia-noite (22:00 às 06:00)", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ workStartTime: "22:00", workEndTime: "06:00" }),
    )
    mockFormatFn.mockReturnValue("23:30")

    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
  })

  it("considera válido às 02:00 em um turno noturno que cruza meia-noite (22:00 às 06:00)", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ workStartTime: "22:00", workEndTime: "06:00" }),
    )
    mockFormatFn.mockReturnValue("02:00")

    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
  })

  it("considera inválido às 12:00 em um turno noturno (22:00 às 06:00)", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ workStartTime: "22:00", workEndTime: "06:00" }),
    )
    mockFormatFn.mockReturnValue(WORK_HOUR_MIDDAY)

    const result = await validateHealthSurveyToken(TOKEN_VALUE)

    expect(result).toEqual({
      valid: false,
      error: "Pesquisa disponível apenas no horário de trabalho.",
    })
  })
})

describe("submitHealthSurveyResponse — guards de entrada", () => {
  it("lança AppError TOKEN_INVALID quando o token não existe", async () => {
    mockFindToken.mockResolvedValue(null)

    await expect(submitHealthSurveyResponse(SUBMIT_INPUT)).rejects.toMatchObject({
      code: "TOKEN_INVALID",
    })

    expect(mockCreateResponse).not.toHaveBeenCalled()
  })

  it("lança AppError SURVEY_ALREADY_ANSWERED quando o token já foi usado", async () => {
    mockFindToken.mockResolvedValue(makeTokenRecord({ usedAt: new Date() }))

    await expect(submitHealthSurveyResponse(SUBMIT_INPUT)).rejects.toMatchObject({
      code: "SURVEY_ALREADY_ANSWERED",
    })

    expect(mockCreateResponse).not.toHaveBeenCalled()
  })

  it("lança AppError TOKEN_EXPIRED quando o token está expirado", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ expiresAt: new Date(Date.now() - 1000) }),
    )

    await expect(submitHealthSurveyResponse(SUBMIT_INPUT)).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
    })

    expect(mockCreateResponse).not.toHaveBeenCalled()
  })

  it("lança AppError OUTSIDE_WORK_WINDOW quando fora do horário de trabalho", async () => {
    mockFormatFn.mockReturnValue("22:00")

    await expect(submitHealthSurveyResponse(SUBMIT_INPUT)).rejects.toMatchObject({
      code: "OUTSIDE_WORK_WINDOW",
    })

    expect(mockCreateResponse).not.toHaveBeenCalled()
  })
})

describe("submitHealthSurveyResponse — happy path", () => {
  it("chama createHealthSurveyResponseWithItems com os dados corretos do token", async () => {
    await submitHealthSurveyResponse(SUBMIT_INPUT)

    expect(mockCreateResponse).toHaveBeenCalledOnce()
    expect(mockCreateResponse).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      dispatchId: DISPATCH_ID,
      tokenId: "token-1",
      answers: SUBMIT_INPUT.answers,
    })
  })
})

describe("cleanupExpiredHealthSurveyTokens", () => {
  it("delega para deleteAllTenantsExpiredHealthSurveyTokens e retorna o count", async () => {
    const result = await cleanupExpiredHealthSurveyTokens()

    expect(mockDeleteExpiredTokens).toHaveBeenCalledOnce()
    expect(result).toEqual({ count: 5 })
  })
})
