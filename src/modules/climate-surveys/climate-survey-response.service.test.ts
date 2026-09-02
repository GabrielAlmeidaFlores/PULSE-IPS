import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  validateClimateSurveyToken,
  submitClimateSurveyResponse,
  cleanupExpiredClimateSurveyTokens,
  unlockClimateSurveyViaIdentifier,
} from "@/modules/climate-surveys/climate-survey-response.service"
import {
  findClimateSurveyTokenByValue,
  deleteAllTenantsExpiredClimateSurveyTokens,
  createClimateSurveyResponseWithItems,
  findClimateSurveyDispatchBySignedLinkToken,
  findEmployeeByPhoneOrDocument,
  findUnusedClimateSurveyTokenForEmployee,
  findUsedClimateSurveyTokenForEmployee,
  createClimateSurveyTokens,
  refreshClimateSurveyTokenWorkHours,
} from "@/modules/climate-surveys/climate-survey.repository"
import {
  getCurrentConsent,
  getActiveConsentTermVersion,
  type ConsentWithTermVersion,
} from "@/modules/consent/consent.repository"
import type { ConsentTermVersion } from "@/modules/consent/consent.types"

vi.mock("@/modules/climate-surveys/climate-survey.repository")
vi.mock("@/modules/consent/consent.repository")
vi.mock("@/modules/climate-surveys/climate-survey-analytics.service", () => ({
  completeClimateSurveyResponseAnalytics: vi.fn(),
}))

const mockFormatFn = vi.hoisted(() => vi.fn(() => "12:00"))

vi.mock("date-fns-tz", () => ({
  toZonedTime: vi.fn((date: Date) => date),
}))
vi.mock("date-fns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("date-fns")>()
  return {
    ...actual,
    format: mockFormatFn,
  }
})

const mockFindToken = vi.mocked(findClimateSurveyTokenByValue)
const mockDeleteExpiredTokens = vi.mocked(deleteAllTenantsExpiredClimateSurveyTokens)
const mockCreateResponse = vi.mocked(createClimateSurveyResponseWithItems)
const mockGetCurrentConsent = vi.mocked(getCurrentConsent)
const mockGetActiveConsentTermVersion = vi.mocked(getActiveConsentTermVersion)
const mockFindDispatchBySignedLink = vi.mocked(findClimateSurveyDispatchBySignedLinkToken)
const mockFindEmployeeByPhoneOrDocument = vi.mocked(findEmployeeByPhoneOrDocument)
const mockFindUnusedToken = vi.mocked(findUnusedClimateSurveyTokenForEmployee)
const mockFindUsedToken = vi.mocked(findUsedClimateSurveyTokenForEmployee)
const mockCreateTokens = vi.mocked(createClimateSurveyTokens)
const mockRefreshTokenWorkHours = vi.mocked(refreshClimateSurveyTokenWorkHours)

const TOKEN_VALUE = "token-abc-123"
const WORK_HOUR_MIDDAY = "12:00"
const TENANT_ID = "tenant-1"
const EMPLOYEE_ID = "employee-1"
const DISPATCH_ID = "dispatch-1"
const CONFIG_ID = "config-1"
const SIGNED_LINK_TOKEN = "signed-link-token-xyz"
const EMPLOYEE_PHONE = "+5511999999999"

type TokenRecord = NonNullable<Awaited<ReturnType<typeof findClimateSurveyTokenByValue>>>
type DispatchRecord = NonNullable<Awaited<ReturnType<typeof findClimateSurveyDispatchBySignedLinkToken>>>
type EmployeeRecord = NonNullable<Awaited<ReturnType<typeof findEmployeeByPhoneOrDocument>>>
type TokenRow = NonNullable<Awaited<ReturnType<typeof findUnusedClimateSurveyTokenForEmployee>>>

function makeTokenRecord(overrides?: Partial<TokenRecord>): TokenRecord {
  const base: TokenRecord = {
    id: "token-1",
    tenantId: TENANT_ID,
    employeeId: EMPLOYEE_ID,
    dispatchId: DISPATCH_ID,
    token: TOKEN_VALUE,
    shortCode: null,
    usedAt: null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    workStartTime: "09:00",
    workEndTime: "18:00",
    reminderSentAt: null,
    createdAt: new Date("2024-01-15T09:00:00Z"),
    employee: {
      id: EMPLOYEE_ID,
      tenantId: TENANT_ID,
      departmentId: "dept-1",
      name: "Ana Silva",
      email: null,
      document: null,
      phone: EMPLOYEE_PHONE,
      workStartTime: null,
      workEndTime: null,
      status: "active",
      pauseStartAt: null,
      pauseEndAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    dispatch: {
      id: DISPATCH_ID,
      tenantId: TENANT_ID,
      climateSurveyConfigurationId: CONFIG_ID,
      scheduledAt: new Date(),
      dispatchedAt: new Date(),
      status: "available",
      source: "auto",
      adherenceCheckedAt: null,
      signedLinkToken: null,
      createdAt: new Date(),
      climateSurveyConfiguration: {
        id: CONFIG_ID,
        tenantId: TENANT_ID,
        name: "Pesquisa de Clima",
        description: null,
        frequency: "weekly",
        scheduledDayOfMonth: null,
        dispatchTime: "09:00",
        respectEmployeeSchedule: false,
        tokenExpiryHours: 48,
        sendViaMessaging: true,
        sendViaSignedLink: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [
          {
            id: "question-1",
            tenantId: TENANT_ID,
            climateSurveyConfigurationId: CONFIG_ID,
            text: "Como você se sente hoje?",
            order: 1,
            scoreDirection: "higher_is_better",
            dimension: "organizational_culture",
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
          climateSurveyMinRespondentsPercent: 40,
          isActive: true,
          trialExpiresAt: null,
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
  source: "message_link",
  documentHash: null,
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

describe("validateClimateSurveyToken — guards de entrada", () => {
  it("retorna inválido quando o token não existe", async () => {
    mockFindToken.mockResolvedValue(null)

    const result = await validateClimateSurveyToken("inexistente")

    expect(result).toEqual({ valid: false, error: "Link inválido ou expirado." })
  })

  it("retorna inválido quando o token já foi usado", async () => {
    mockFindToken.mockResolvedValue(makeTokenRecord({ usedAt: new Date() }))

    const result = await validateClimateSurveyToken(TOKEN_VALUE)

    expect(result).toEqual({ valid: false, error: "Esta pesquisa já foi respondida." })
  })

  it("retorna inválido quando o token está expirado", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ expiresAt: new Date(Date.now() - 1000) }),
    )

    const result = await validateClimateSurveyToken(TOKEN_VALUE)

    expect(result).toEqual({ valid: false, error: "Este link expirou." })
  })

  it("retorna inválido quando fora da janela de trabalho", async () => {
    mockFormatFn.mockReturnValue("22:00")

    const result = await validateClimateSurveyToken(TOKEN_VALUE)

    expect(result).toEqual({
      valid: false,
      error: "Pesquisa disponível apenas no horário de trabalho.",
    })
  })

  it("retorna válido quando o dispatch está com status 'scheduled' (resposta antecipada via link assinado)", async () => {
    const base = makeTokenRecord()
    mockFindToken.mockResolvedValue(
      makeTokenRecord({
        dispatch: { ...base.dispatch, status: "scheduled" },
      }),
    )

    const result = await validateClimateSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
  })
})

describe("validateClimateSurveyToken — token válido", () => {
  it("retorna válido com consentStatus 'accepted' quando o colaborador aceitou a versão ativa", async () => {
    const result = await validateClimateSurveyToken(TOKEN_VALUE)

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

    const result = await validateClimateSurveyToken(TOKEN_VALUE)

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

    const result = await validateClimateSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.consentStatus).toBe("needs_consent")
  })

  it("retorna o timezone da organização no resultado", async () => {
    const result = await validateClimateSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.timezone).toBe("America/Sao_Paulo")
  })

  it("inclui os dados do token no resultado para controle do formulário", async () => {
    const result = await validateClimateSurveyToken(TOKEN_VALUE)

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

describe("validateClimateSurveyToken — janela de trabalho noturna", () => {
  it("considera válido às 23:30 em um turno noturno que cruza meia-noite (22:00 às 06:00)", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ workStartTime: "22:00", workEndTime: "06:00" }),
    )
    mockFormatFn.mockReturnValue("23:30")

    const result = await validateClimateSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
  })

  it("considera válido às 02:00 em um turno noturno que cruza meia-noite (22:00 às 06:00)", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ workStartTime: "22:00", workEndTime: "06:00" }),
    )
    mockFormatFn.mockReturnValue("02:00")

    const result = await validateClimateSurveyToken(TOKEN_VALUE)

    expect(result.valid).toBe(true)
  })

  it("considera inválido às 12:00 em um turno noturno (22:00 às 06:00)", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ workStartTime: "22:00", workEndTime: "06:00" }),
    )
    mockFormatFn.mockReturnValue(WORK_HOUR_MIDDAY)

    const result = await validateClimateSurveyToken(TOKEN_VALUE)

    expect(result).toEqual({
      valid: false,
      error: "Pesquisa disponível apenas no horário de trabalho.",
    })
  })
})

describe("submitClimateSurveyResponse — guards de entrada", () => {
  it("lança AppError TOKEN_INVALID quando o token não existe", async () => {
    mockFindToken.mockResolvedValue(null)

    await expect(submitClimateSurveyResponse(SUBMIT_INPUT)).rejects.toMatchObject({
      code: "TOKEN_INVALID",
    })

    expect(mockCreateResponse).not.toHaveBeenCalled()
  })

  it("lança AppError SURVEY_ALREADY_ANSWERED quando o token já foi usado", async () => {
    mockFindToken.mockResolvedValue(makeTokenRecord({ usedAt: new Date() }))

    await expect(submitClimateSurveyResponse(SUBMIT_INPUT)).rejects.toMatchObject({
      code: "SURVEY_ALREADY_ANSWERED",
    })

    expect(mockCreateResponse).not.toHaveBeenCalled()
  })

  it("lança AppError TOKEN_EXPIRED quando o token está expirado", async () => {
    mockFindToken.mockResolvedValue(
      makeTokenRecord({ expiresAt: new Date(Date.now() - 1000) }),
    )

    await expect(submitClimateSurveyResponse(SUBMIT_INPUT)).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
    })

    expect(mockCreateResponse).not.toHaveBeenCalled()
  })

  it("lança AppError OUTSIDE_WORK_WINDOW quando fora do horário de trabalho", async () => {
    mockFormatFn.mockReturnValue("22:00")

    await expect(submitClimateSurveyResponse(SUBMIT_INPUT)).rejects.toMatchObject({
      code: "OUTSIDE_WORK_WINDOW",
    })

    expect(mockCreateResponse).not.toHaveBeenCalled()
  })
})

describe("submitClimateSurveyResponse — happy path", () => {
  it("chama createClimateSurveyResponseWithItems com os dados corretos do token", async () => {
    await submitClimateSurveyResponse(SUBMIT_INPUT)

    expect(mockCreateResponse).toHaveBeenCalledOnce()
    expect(mockCreateResponse).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      dispatchId: DISPATCH_ID,
      departmentId: "dept-1",
      tokenId: "token-1",
      answers: SUBMIT_INPUT.answers,
    })
  })

  it("propaga comentário aberto quando preenchido (com trim)", async () => {
    await submitClimateSurveyResponse({ ...SUBMIT_INPUT, openComment: "  Ambiente ótimo  " })

    expect(mockCreateResponse).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      dispatchId: DISPATCH_ID,
      departmentId: "dept-1",
      tokenId: "token-1",
      answers: SUBMIT_INPUT.answers,
      openComment: "Ambiente ótimo",
    })
  })

  it("não inclui openComment quando vazio ou só espaços", async () => {
    await submitClimateSurveyResponse({ ...SUBMIT_INPUT, openComment: "   " })

    expect(mockCreateResponse).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      dispatchId: DISPATCH_ID,
      departmentId: "dept-1",
      tokenId: "token-1",
      answers: SUBMIT_INPUT.answers,
    })
  })

  it("rejeita comentário aberto acima de 1000 caracteres", async () => {
    await expect(
      submitClimateSurveyResponse({ ...SUBMIT_INPUT, openComment: "a".repeat(1001) }),
    ).rejects.toMatchObject({ code: "OPEN_COMMENT_TOO_LONG" })
    expect(mockCreateResponse).not.toHaveBeenCalled()
  })

  it("nunca persiste employeeId na resposta — apenas token e setor", async () => {
    await submitClimateSurveyResponse(SUBMIT_INPUT)

    const [payload] = mockCreateResponse.mock.calls[0] as [{ employeeId?: string }]
    expect(payload).not.toHaveProperty("employeeId")
  })
})

describe("cleanupExpiredClimateSurveyTokens", () => {
  it("delega para deleteAllTenantsExpiredClimateSurveyTokens e retorna o count", async () => {
    const result = await cleanupExpiredClimateSurveyTokens()

    expect(mockDeleteExpiredTokens).toHaveBeenCalledOnce()
    expect(result).toEqual({ count: 5 })
  })
})

function makeDispatchRecord(overrides?: Partial<DispatchRecord>): DispatchRecord {
  const base: DispatchRecord = {
    id: DISPATCH_ID,
    tenantId: TENANT_ID,
    climateSurveyConfigurationId: CONFIG_ID,
    scheduledAt: new Date(),
    dispatchedAt: new Date(),
    status: "available",
    source: "auto",
    adherenceCheckedAt: null,
    signedLinkToken: SIGNED_LINK_TOKEN,
    createdAt: new Date(),
    climateSurveyConfiguration: {
      id: CONFIG_ID,
      tenantId: TENANT_ID,
      name: "Pesquisa de Clima",
      description: null,
      frequency: "weekly",
      scheduledDayOfMonth: null,
      dispatchTime: "09:00",
      respectEmployeeSchedule: false,
      tokenExpiryHours: 48,
      sendViaMessaging: true,
      sendViaSignedLink: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: {
        id: TENANT_ID,
        slug: "acme",
        name: "Acme Corp",
        planId: null,
        externalCustomerId: null,
        timezone: "America/Sao_Paulo",
        billingStatus: "active",
        maxEmployeesOverride: null,
        climateSurveyMinRespondentsPercent: 40,
        isActive: true,
        trialExpiresAt: null,
        deletionScheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      configDepartments: [
        {
          department: {
            id: "dept-1",
            tenantId: TENANT_ID,
            name: "Tecnologia",
            isActive: true,
            workStartTime: "09:00",
            workEndTime: "18:00",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    },
  }
  return { ...base, ...overrides }
}

function makeEmployee(overrides?: Partial<EmployeeRecord>): EmployeeRecord {
  const base: EmployeeRecord = {
    id: EMPLOYEE_ID,
    tenantId: TENANT_ID,
    departmentId: "dept-1",
    name: "Ana Silva",
    email: null,
    document: null,
    phone: EMPLOYEE_PHONE,
    workStartTime: null,
    workEndTime: null,
    status: "active",
    pauseStartAt: null,
    pauseEndAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  return { ...base, ...overrides }
}

function makeTokenRow(overrides?: Partial<TokenRow>): TokenRow {
  const base: TokenRow = {
    id: "token-row-1",
    tenantId: TENANT_ID,
    dispatchId: DISPATCH_ID,
    employeeId: EMPLOYEE_ID,
    token: "existing-token-xyz",
    shortCode: null,
    usedAt: null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
    workStartTime: "09:00",
    workEndTime: "18:00",
    reminderSentAt: null,
    createdAt: new Date(),
  }
  return { ...base, ...overrides }
}

describe("unlockClimateSurveyViaIdentifier — guards", () => {
  beforeEach(() => {
    mockFindDispatchBySignedLink.mockResolvedValue(makeDispatchRecord())
    mockFindEmployeeByPhoneOrDocument.mockResolvedValue(makeEmployee())
    mockFindUsedToken.mockResolvedValue(null)
    mockFindUnusedToken.mockResolvedValue(null)
    mockCreateTokens.mockResolvedValue(undefined)
    mockRefreshTokenWorkHours.mockResolvedValue(undefined)
  })

  it("lança DISPATCH_NOT_FOUND quando o signed link não existe", async () => {
    mockFindDispatchBySignedLink.mockResolvedValue(null)

    await expect(unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE))
      .rejects.toMatchObject({ code: "DISPATCH_NOT_FOUND" })
  })

  it("lança EMPLOYEE_NOT_FOUND quando o identificador não corresponde a nenhum colaborador", async () => {
    mockFindEmployeeByPhoneOrDocument.mockResolvedValue(null)

    await expect(unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, "99999999999"))
      .rejects.toMatchObject({ code: "EMPLOYEE_NOT_FOUND" })
  })

  it("lança EMPLOYEE_NOT_IN_DEPARTMENT quando o colaborador pertence a outro setor", async () => {
    mockFindEmployeeByPhoneOrDocument.mockResolvedValue(makeEmployee({ departmentId: "dept-outro" }))

    await expect(unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE))
      .rejects.toMatchObject({ code: "EMPLOYEE_NOT_IN_DEPARTMENT" })
  })

  it("lança OUTSIDE_WORK_WINDOW quando fora do horário de trabalho e colaborador não aceitou o TCLE", async () => {
    mockFormatFn.mockReturnValue("22:00")
    mockGetCurrentConsent.mockResolvedValue(null)

    await expect(unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE))
      .rejects.toMatchObject({ code: "OUTSIDE_WORK_WINDOW" })
  })

  it("lança OUTSIDE_WORK_WINDOW quando fora do horário de trabalho e colaborador aceitou o TCLE", async () => {
    mockFormatFn.mockReturnValue("22:00")

    await expect(unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE))
      .rejects.toMatchObject({ code: "OUTSIDE_WORK_WINDOW" })
  })

  it("retorna needsConsent quando o colaborador não tem consentimento registrado", async () => {
    mockGetCurrentConsent.mockResolvedValue(null)
    mockFindUnusedToken.mockResolvedValue(null)

    const result = await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(result.needsConsent).toBe(true)
    expect(result.alreadyAnswered).toBe(false)
    expect(result.employeeName).toBe("Ana Silva")
    expect(result.consentTermContent).toBe("<p>Termos</p>")
    expect(typeof result.token).toBe("string")
    expect(mockCreateTokens).toHaveBeenCalledOnce()
  })

  it("retorna needsConsent quando o colaborador recusou o TCLE", async () => {
    mockGetCurrentConsent.mockResolvedValue({ ...ACCEPTED_CONSENT, event: "refused" })
    mockFindUnusedToken.mockResolvedValue(null)

    const result = await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(result.needsConsent).toBe(true)
    expect(mockCreateTokens).toHaveBeenCalledOnce()
  })

  it("retorna needsConsent quando o colaborador aceitou versão anterior do TCLE", async () => {
    mockGetCurrentConsent.mockResolvedValue({ ...ACCEPTED_CONSENT, consentTermVersionId: "term-antiga" })
    mockFindUnusedToken.mockResolvedValue(null)

    const result = await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(result.needsConsent).toBe(true)
    expect(mockCreateTokens).toHaveBeenCalledOnce()
  })

  it("reutiliza token existente sem criar novo quando já existe token não usado e consentimento é necessário", async () => {
    mockGetCurrentConsent.mockResolvedValue(null)
    mockFindUnusedToken.mockResolvedValue(makeTokenRow({ token: "existing-consent-token" }))

    const result = await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(result.needsConsent).toBe(true)
    expect(result.token).toBe("existing-consent-token")
    expect(mockCreateTokens).not.toHaveBeenCalled()
  })
})

describe("unlockClimateSurveyViaIdentifier — retorno de token existente", () => {
  beforeEach(() => {
    mockFindDispatchBySignedLink.mockResolvedValue(makeDispatchRecord())
    mockFindEmployeeByPhoneOrDocument.mockResolvedValue(makeEmployee())
    mockRefreshTokenWorkHours.mockResolvedValue(undefined)
  })

  it("retorna alreadyAnswered true quando o funcionário já respondeu", async () => {
    mockFindUsedToken.mockResolvedValue(makeTokenRow({ token: "used-token", usedAt: new Date() }))
    mockFindUnusedToken.mockResolvedValue(null)

    const result = await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(result).toEqual({ token: "used-token", alreadyAnswered: true })
    expect(mockCreateTokens).not.toHaveBeenCalled()
  })

  it("retorna token existente sem criar novo quando já existe token não usado", async () => {
    mockFindUsedToken.mockResolvedValue(null)
    mockFindUnusedToken.mockResolvedValue(makeTokenRow({ token: "existing-unused-token" }))

    const result = await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(result).toEqual({ token: "existing-unused-token", alreadyAnswered: false })
    expect(mockCreateTokens).not.toHaveBeenCalled()
  })

  it("atualiza snapshot de horários do token existente quando estão desatualizados", async () => {
    const staleDispatch = makeDispatchRecord()
    mockFindDispatchBySignedLink.mockResolvedValue({
      ...staleDispatch,
      climateSurveyConfiguration: {
        ...staleDispatch.climateSurveyConfiguration,
        configDepartments: [
          {
            department: {
              id: "dept-1",
              tenantId: TENANT_ID,
              name: "Tecnologia",
              isActive: true,
              workStartTime: "05:00",
              workEndTime: "22:00",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      },
    })
    mockFindUsedToken.mockResolvedValue(null)
    mockFindUnusedToken.mockResolvedValue(makeTokenRow({ id: "stale-token-id", token: "stale-token", workStartTime: "09:00", workEndTime: "18:00" }))

    const result = await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(result.token).toBe("stale-token")
    expect(mockRefreshTokenWorkHours).toHaveBeenCalledWith("stale-token-id", "05:00", "22:00")
  })

  it("não atualiza snapshot do token existente quando horários já estão corretos", async () => {
    mockFindUsedToken.mockResolvedValue(null)
    mockFindUnusedToken.mockResolvedValue(makeTokenRow({ token: "existing-unused-token", workStartTime: "09:00", workEndTime: "18:00" }))

    await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(mockRefreshTokenWorkHours).not.toHaveBeenCalled()
  })
})

describe("unlockClimateSurveyViaIdentifier — criação de novo token", () => {
  beforeEach(() => {
    mockFindDispatchBySignedLink.mockResolvedValue(makeDispatchRecord())
    mockFindEmployeeByPhoneOrDocument.mockResolvedValue(makeEmployee())
    mockFindUsedToken.mockResolvedValue(null)
    mockFindUnusedToken.mockResolvedValue(null)
    mockCreateTokens.mockResolvedValue(undefined)
    mockRefreshTokenWorkHours.mockResolvedValue(undefined)
  })

  it("cria novo token e retorna alreadyAnswered false", async () => {
    const result = await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(result.alreadyAnswered).toBe(false)
    expect(typeof result.token).toBe("string")
    expect(result.token.length).toBeGreaterThan(0)
    expect(mockCreateTokens).toHaveBeenCalledOnce()
  })

  it("usa workStartTime e workEndTime do funcionário quando preenchidos", async () => {
    mockFindEmployeeByPhoneOrDocument.mockResolvedValue(
      makeEmployee({ workStartTime: "07:00", workEndTime: "16:00" }),
    )

    await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(mockCreateTokens).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ workStartTime: "07:00", workEndTime: "16:00" }),
      ]),
    )
  })

  it("usa workStartTime e workEndTime do departamento quando funcionário não tem horário próprio", async () => {
    mockFindEmployeeByPhoneOrDocument.mockResolvedValue(
      makeEmployee({ workStartTime: null, workEndTime: null }),
    )

    await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(mockCreateTokens).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ workStartTime: "09:00", workEndTime: "18:00" }),
      ]),
    )
  })

  it("usa workStartTime e workEndTime do departamento no snapshot do token", async () => {
    const baseDispatch = makeDispatchRecord()
    mockFindDispatchBySignedLink.mockResolvedValue({
      ...baseDispatch,
      climateSurveyConfiguration: {
        ...baseDispatch.climateSurveyConfiguration,
        configDepartments: [
          {
            department: {
              id: "dept-1",
              tenantId: TENANT_ID,
              name: "Tecnologia",
              isActive: true,
              workStartTime: "07:00",
              workEndTime: "16:00",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      },
    })
    mockFindEmployeeByPhoneOrDocument.mockResolvedValue(
      makeEmployee({ workStartTime: null, workEndTime: null }),
    )

    await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, EMPLOYEE_PHONE)

    expect(mockCreateTokens).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ workStartTime: "07:00", workEndTime: "16:00" }),
      ]),
    )
  })

  it("busca funcionário pelo documento quando identficador é um documento", async () => {
    await unlockClimateSurveyViaIdentifier(SIGNED_LINK_TOKEN, "12345678901")

    expect(mockFindEmployeeByPhoneOrDocument).toHaveBeenCalledWith(TENANT_ID, "12345678901")
  })
})
