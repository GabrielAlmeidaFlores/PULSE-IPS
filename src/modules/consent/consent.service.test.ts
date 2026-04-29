import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createConsentRecord,
  findConsentByToken,
  findExistingConsentEvent,
  getActiveConsentTermVersion,
  findEmployeeForConsent,
  createConsentTermVersion,
} from "@/modules/consent/consent.repository"
import { findTokenByValue, markTokenUsed } from "@/modules/health-surveys/health-survey.repository"
import {
  sendConsentInvite,
  recordAcceptance,
  recordRefusal,
  optOut,
  optOutFromHealthSurveyToken,
  publishNewConsentTermVersion,
  getConsentByToken,
  getActiveTermVersion,
  acceptConsentFromHealthSurveyToken,
  refuseConsentFromHealthSurveyToken,
} from "@/modules/consent/consent.service"
import { AppError } from "@/libs/errors/app-error"

vi.mock("@/modules/consent/consent.repository", () => ({
  createConsentRecord: vi.fn(),
  findConsentByToken: vi.fn(),
  findExistingConsentEvent: vi.fn(),
  getActiveConsentTermVersion: vi.fn(),
  findEmployeeForConsent: vi.fn(),
  getAllConsentTermVersions: vi.fn(),
  createConsentTermVersion: vi.fn(),
  getCurrentConsent: vi.fn(),
  findEmployeeIdsWithAcceptedConsent: vi.fn(),
}))

vi.mock("@/modules/health-surveys/health-survey.repository", () => ({
  findTokenByValue: vi.fn(),
  markTokenUsed: vi.fn(),
}))

vi.mock("@/libs/queue", () => ({
  getMessageQueue: vi.fn(() => ({ add: vi.fn() })),
}))

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    MESSAGING_PROVIDER: "console",
    CONSENT_MESSAGE_TEMPLATE: "Oi, {nome}! Acesse: {link}",
    WHATSAPP_CONSENT_TEMPLATE_NAME: "pulse_consent_invite",
  },
}))

const mockCreateConsentRecord = vi.mocked(createConsentRecord)
const mockFindConsentByToken = vi.mocked(findConsentByToken)
const mockFindExistingConsentEvent = vi.mocked(findExistingConsentEvent)
const mockGetActiveConsentTermVersion = vi.mocked(getActiveConsentTermVersion)
const mockFindEmployeeForConsent = vi.mocked(findEmployeeForConsent)
const mockCreateConsentTermVersion = vi.mocked(createConsentTermVersion)
const mockFindTokenByValue = vi.mocked(findTokenByValue)
const mockMarkTokenUsed = vi.mocked(markTokenUsed)

const TENANT_ID = "tenant-1"
const EMPLOYEE_ID = "employee-1"
const TERM_VERSION_ID = "term-version-1"
const TERMS_CONTENT = "<p>Termos</p>"
const INVITE_TOKEN = "invite-token-abc"

const activeTermVersion = {
  id: TERM_VERSION_ID,
  version: "1.0",
  content: "Conteúdo dos termos",
  contentHash: "hash123",
  isActive: true,
  createdAt: new Date(),
}

const baseConsentInvite = {
  id: "consent-1",
  tenantId: TENANT_ID,
  employeeId: EMPLOYEE_ID,
  consentTermVersionId: TERM_VERSION_ID,
  event: "invited",
  source: "sms_link",
  token: INVITE_TOKEN,
  tokenExpiresAt: new Date(Date.now() + 86400000),
  cpfHash: null,
  createdAt: new Date(),
}

const activeEmployee = {
  id: EMPLOYEE_ID,
  tenantId: TENANT_ID,
  name: "João Silva",
  phone: "+5511999999999",
  departmentId: "dept-1",
  email: null,
  status: "active",
  workStartTime: null,
  workEndTime: null,
  pauseStartAt: null,
  pauseEndAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("sendConsentInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActiveConsentTermVersion.mockResolvedValue(activeTermVersion)
    mockFindEmployeeForConsent.mockResolvedValue(activeEmployee)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as Awaited<ReturnType<typeof createConsentRecord>>)
  })

  it("creates an invited consent record with correct tenant and employee", async () => {
    await sendConsentInvite(TENANT_ID, EMPLOYEE_ID)

    expect(mockCreateConsentRecord).toHaveBeenCalledWith(
      expect.objectContaining({ event: "invited", source: "sms_link", tenantId: TENANT_ID, employeeId: EMPLOYEE_ID, consentTermVersionId: TERM_VERSION_ID }),
    )
  })

  it("throws NO_ACTIVE_TERMS when no active term version exists", async () => {
    mockGetActiveConsentTermVersion.mockResolvedValue(null)

    await expect(sendConsentInvite(TENANT_ID, EMPLOYEE_ID)).rejects.toMatchObject({ code: "NO_ACTIVE_TERMS" })
  })

  it("does not create consent record when no active term version exists", async () => {
    mockGetActiveConsentTermVersion.mockResolvedValue(null)

    await expect(sendConsentInvite(TENANT_ID, EMPLOYEE_ID)).rejects.toThrow()
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("throws EMPLOYEE_NOT_FOUND when employee does not exist", async () => {
    mockFindEmployeeForConsent.mockResolvedValue(null)

    await expect(sendConsentInvite(TENANT_ID, EMPLOYEE_ID)).rejects.toMatchObject({ code: "EMPLOYEE_NOT_FOUND" })
  })

  it("does not create consent record when employee does not exist", async () => {
    mockFindEmployeeForConsent.mockResolvedValue(null)

    await expect(sendConsentInvite(TENANT_ID, EMPLOYEE_ID)).rejects.toThrow()
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("generates a unique token for each invite", async () => {
    await sendConsentInvite(TENANT_ID, EMPLOYEE_ID)
    await sendConsentInvite(TENANT_ID, EMPLOYEE_ID)

    const token1 = mockCreateConsentRecord.mock.calls[0]?.[0]?.token
    const token2 = mockCreateConsentRecord.mock.calls[1]?.[0]?.token
    expect(token1).not.toBe(token2)
  })
})

describe("recordAcceptance — LGPD append-only rule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindConsentByToken.mockResolvedValue(baseConsentInvite as Awaited<ReturnType<typeof findConsentByToken>>)
    mockFindExistingConsentEvent.mockResolvedValue(null)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as Awaited<ReturnType<typeof createConsentRecord>>)
  })

  it("creates an accepted consent record with correct tenant and employee", async () => {
    await recordAcceptance(INVITE_TOKEN)

    expect(mockCreateConsentRecord).toHaveBeenCalledWith(
      expect.objectContaining({ event: "accepted", tenantId: TENANT_ID, employeeId: EMPLOYEE_ID }),
    )
  })

  it("stores cpfHash when provided", async () => {
    await recordAcceptance(INVITE_TOKEN, "hashed-cpf-value")

    const call = mockCreateConsentRecord.mock.calls[0]?.[0]
    expect(call?.cpfHash).toBe("hashed-cpf-value")
  })

  it("does not store cpfHash when not provided", async () => {
    await recordAcceptance(INVITE_TOKEN)

    const call = mockCreateConsentRecord.mock.calls[0]?.[0]
    expect(call?.cpfHash).toBeUndefined()
  })

  it("throws TOKEN_INVALID when token does not exist", async () => {
    mockFindConsentByToken.mockResolvedValue(null)

    await expect(recordAcceptance(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_INVALID" })
  })

  it("does not create record when token does not exist", async () => {
    mockFindConsentByToken.mockResolvedValue(null)

    await expect(recordAcceptance(INVITE_TOKEN)).rejects.toThrow()
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("throws TOKEN_EXPIRED when token is past expiry", async () => {
    mockFindConsentByToken.mockResolvedValue({
      ...baseConsentInvite,
      tokenExpiresAt: new Date(Date.now() - 1000),
    } as Awaited<ReturnType<typeof findConsentByToken>>)

    await expect(recordAcceptance(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" })
  })

  it("does not create record when token is expired", async () => {
    mockFindConsentByToken.mockResolvedValue({
      ...baseConsentInvite,
      tokenExpiresAt: new Date(Date.now() - 1000),
    } as Awaited<ReturnType<typeof findConsentByToken>>)

    await expect(recordAcceptance(INVITE_TOKEN)).rejects.toThrow()
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("throws TOKEN_USED when already accepted or refused — enforces append-only uniqueness", async () => {
    mockFindExistingConsentEvent.mockResolvedValue({ ...baseConsentInvite, event: "accepted" } as Awaited<ReturnType<typeof findExistingConsentEvent>>)

    await expect(recordAcceptance(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_USED" })
  })

  it("does not create record when consent already exists", async () => {
    mockFindExistingConsentEvent.mockResolvedValue({ ...baseConsentInvite, event: "accepted" } as Awaited<ReturnType<typeof findExistingConsentEvent>>)

    await expect(recordAcceptance(INVITE_TOKEN)).rejects.toThrow()
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("checks for both accepted and refused events to prevent double submission", async () => {
    await recordAcceptance(INVITE_TOKEN)

    expect(mockFindExistingConsentEvent).toHaveBeenCalledWith(
      TENANT_ID,
      EMPLOYEE_ID,
      TERM_VERSION_ID,
      expect.arrayContaining(["accepted", "refused"]),
    )
  })
})

describe("recordRefusal — LGPD append-only rule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindConsentByToken.mockResolvedValue(baseConsentInvite as Awaited<ReturnType<typeof findConsentByToken>>)
    mockFindExistingConsentEvent.mockResolvedValue(null)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as Awaited<ReturnType<typeof createConsentRecord>>)
  })

  it("creates a refused consent record with correct tenant and employee", async () => {
    await recordRefusal(INVITE_TOKEN)

    expect(mockCreateConsentRecord).toHaveBeenCalledWith(
      expect.objectContaining({ event: "refused", tenantId: TENANT_ID, employeeId: EMPLOYEE_ID }),
    )
  })

  it("throws TOKEN_INVALID when token does not exist", async () => {
    mockFindConsentByToken.mockResolvedValue(null)
    await expect(recordRefusal(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_INVALID" })
  })

  it("throws TOKEN_EXPIRED when token is past expiry", async () => {
    mockFindConsentByToken.mockResolvedValue({
      ...baseConsentInvite,
      tokenExpiresAt: new Date(Date.now() - 1000),
    } as Awaited<ReturnType<typeof findConsentByToken>>)
    await expect(recordRefusal(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" })
  })

  it("throws TOKEN_USED when already responded", async () => {
    mockFindExistingConsentEvent.mockResolvedValue({ ...baseConsentInvite, event: "refused" } as Awaited<ReturnType<typeof findExistingConsentEvent>>)
    await expect(recordRefusal(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_USED" })
  })

  it("does not create record when consent already exists", async () => {
    mockFindExistingConsentEvent.mockResolvedValue({ ...baseConsentInvite, event: "refused" } as Awaited<ReturnType<typeof findExistingConsentEvent>>)
    await expect(recordRefusal(INVITE_TOKEN)).rejects.toThrow()
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })
})

describe("optOut — LGPD opt-out flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActiveConsentTermVersion.mockResolvedValue(activeTermVersion)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as Awaited<ReturnType<typeof createConsentRecord>>)
  })

  it("creates an opted_out consent record with correct fields", async () => {
    await optOut(TENANT_ID, EMPLOYEE_ID)

    expect(mockCreateConsentRecord).toHaveBeenCalledWith(
      expect.objectContaining({ event: "opted_out", source: "health_survey_form", tenantId: TENANT_ID, employeeId: EMPLOYEE_ID }),
    )
  })

  it("throws NO_ACTIVE_TERMS when no active term version exists", async () => {
    mockGetActiveConsentTermVersion.mockResolvedValue(null)
    await expect(optOut(TENANT_ID, EMPLOYEE_ID)).rejects.toMatchObject({ code: "NO_ACTIVE_TERMS" })
  })

  it("does not create record when no active term version exists", async () => {
    mockGetActiveConsentTermVersion.mockResolvedValue(null)
    await expect(optOut(TENANT_ID, EMPLOYEE_ID)).rejects.toThrow()
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })
})

describe("optOutFromHealthSurveyToken — opt-out via health survey link", () => {
  const healthSurveyToken = "health-survey-token-xyz"
  const tokenRecord = {
    id: "token-id-1",
    tenantId: TENANT_ID,
    employeeId: EMPLOYEE_ID,
    usedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
  }

  const HEALTH_SURVEY_RESPONSE_TOKEN = {
    id: "srt-1",
    tenantId: TENANT_ID,
    dispatchId: "dispatch-1",
    employeeId: EMPLOYEE_ID,
    token: healthSurveyToken,
    usedAt: new Date(),
    expiresAt: new Date(),
    workStartTime: "09:00",
    workEndTime: "18:00",
    createdAt: new Date(),
  } as Awaited<ReturnType<typeof markTokenUsed>>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindTokenByValue.mockResolvedValue(tokenRecord as Awaited<ReturnType<typeof findTokenByValue>>)
    mockGetActiveConsentTermVersion.mockResolvedValue(activeTermVersion)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as Awaited<ReturnType<typeof createConsentRecord>>)
    mockMarkTokenUsed.mockResolvedValue(HEALTH_SURVEY_RESPONSE_TOKEN)
  })

  it("creates opted_out consent record with correct fields", async () => {
    await optOutFromHealthSurveyToken(healthSurveyToken)

    expect(mockCreateConsentRecord).toHaveBeenCalledWith(
      expect.objectContaining({ event: "opted_out", source: "health_survey_form" }),
    )
  })

  it("marks the health survey token as used after opt-out", async () => {
    await optOutFromHealthSurveyToken(healthSurveyToken)

    expect(mockMarkTokenUsed).toHaveBeenCalledWith(tokenRecord.tenantId, tokenRecord.id)
  })

  it("throws INVALID_TOKEN when health survey token not found", async () => {
    mockFindTokenByValue.mockResolvedValue(null)
    await expect(optOutFromHealthSurveyToken(healthSurveyToken)).rejects.toMatchObject({ code: "INVALID_TOKEN" })
  })

  it("does not create consent record when token not found", async () => {
    mockFindTokenByValue.mockResolvedValue(null)
    await expect(optOutFromHealthSurveyToken(healthSurveyToken)).rejects.toThrow()
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("does not mark token used when token not found", async () => {
    mockFindTokenByValue.mockResolvedValue(null)
    await expect(optOutFromHealthSurveyToken(healthSurveyToken)).rejects.toThrow()
    expect(mockMarkTokenUsed).not.toHaveBeenCalled()
  })

  it("throws TOKEN_USED when health survey token already used", async () => {
    mockFindTokenByValue.mockResolvedValue({ ...tokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findTokenByValue>>)
    await expect(optOutFromHealthSurveyToken(healthSurveyToken)).rejects.toMatchObject({ code: "TOKEN_USED" })
  })

  it("does not create consent record when token is already used", async () => {
    mockFindTokenByValue.mockResolvedValue({ ...tokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findTokenByValue>>)
    await expect(optOutFromHealthSurveyToken(healthSurveyToken)).rejects.toThrow()
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })
})

describe("publishNewConsentTermVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateConsentTermVersion.mockResolvedValue(activeTermVersion)
  })

  it("creates a new term version with provided data", async () => {
    await publishNewConsentTermVersion({ version: "2.0", content: "Novo conteúdo" })
    expect(mockCreateConsentTermVersion).toHaveBeenCalledWith({ version: "2.0", content: "Novo conteúdo" })
  })

  it("trims whitespace from version string", async () => {
    await publishNewConsentTermVersion({ version: "  2.0  ", content: "conteúdo" })
    const call = mockCreateConsentTermVersion.mock.calls[0]?.[0]
    expect(call?.version).toBe("2.0")
  })

  it("trims whitespace from content string", async () => {
    await publishNewConsentTermVersion({ version: "2.0", content: "  conteúdo  " })
    const call = mockCreateConsentTermVersion.mock.calls[0]?.[0]
    expect(call?.content).toBe("conteúdo")
  })

  it("throws INVALID_INPUT when version is blank", () => {
    expect(() => publishNewConsentTermVersion({ version: "   ", content: "conteúdo" })).toThrow(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    )
  })

  it("does not create term version when version is blank", () => {
    expect(() => publishNewConsentTermVersion({ version: "   ", content: "conteúdo" })).toThrow()
    expect(mockCreateConsentTermVersion).not.toHaveBeenCalled()
  })

  it("throws INVALID_INPUT when content is blank", () => {
    expect(() => publishNewConsentTermVersion({ version: "2.0", content: "  " })).toThrow(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    )
  })

  it("does not create term version when content is blank", () => {
    expect(() => publishNewConsentTermVersion({ version: "2.0", content: "  " })).toThrow()
    expect(mockCreateConsentTermVersion).not.toHaveBeenCalled()
  })
})

describe("AppError structure", () => {
  const ERROR_CODE = "SOME_CODE"
  const ERROR_MESSAGE = "mensagem de erro"

  it("exposes code property correctly", () => {
    const err = new AppError(ERROR_CODE, ERROR_MESSAGE)
    expect(err.code).toBe(ERROR_CODE)
  })

  it("exposes message property correctly", () => {
    const err = new AppError(ERROR_CODE, ERROR_MESSAGE)
    expect(err.message).toBe(ERROR_MESSAGE)
  })

  it("has name AppError", () => {
    const err = new AppError(ERROR_CODE, ERROR_MESSAGE)
    expect(err.name).toBe("AppError")
  })

  it("is an instance of Error", () => {
    const err = new AppError(ERROR_CODE, ERROR_MESSAGE)
    expect(err instanceof Error).toBe(true)
  })
})

describe("getConsentByToken", () => {
  it("returns consent record matching repository result", async () => {
    mockFindConsentByToken.mockResolvedValue(baseConsentInvite as Awaited<ReturnType<typeof findConsentByToken>>)

    const result = await getConsentByToken(INVITE_TOKEN)
    expect(result).toEqual(baseConsentInvite)
  })

  it("queries repository with the provided token", async () => {
    mockFindConsentByToken.mockResolvedValue(baseConsentInvite as Awaited<ReturnType<typeof findConsentByToken>>)

    await getConsentByToken(INVITE_TOKEN)
    expect(mockFindConsentByToken).toHaveBeenCalledWith(INVITE_TOKEN)
  })
})

describe("getActiveTermVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the active consent term version", async () => {
    const termVersion = { id: TERM_VERSION_ID, version: "1.0", content: TERMS_CONTENT, isActive: true, contentHash: "hash123", createdAt: new Date() }
    mockGetActiveConsentTermVersion.mockResolvedValue(termVersion as Awaited<ReturnType<typeof getActiveConsentTermVersion>>)

    const result = await getActiveTermVersion()
    expect(result).toEqual(termVersion)
  })

  it("calls repository once to fetch active term version", async () => {
    const termVersion = { id: TERM_VERSION_ID, version: "1.0", content: TERMS_CONTENT, isActive: true, contentHash: "hash123", createdAt: new Date() }
    mockGetActiveConsentTermVersion.mockResolvedValue(termVersion as Awaited<ReturnType<typeof getActiveConsentTermVersion>>)

    await getActiveTermVersion()
    expect(mockGetActiveConsentTermVersion).toHaveBeenCalledOnce()
  })
})

describe("acceptConsentFromHealthSurveyToken", () => {
  const HEALTH_SURVEY_TOKEN = "health-survey-token-abc"
  const tokenRecord = {
    id: "token-1",
    tenantId: TENANT_ID,
    employeeId: EMPLOYEE_ID,
    token: HEALTH_SURVEY_TOKEN,
    usedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
  }
  const activeVersion = { id: TERM_VERSION_ID, version: "1.0", content: TERMS_CONTENT, isActive: true, contentHash: "hash123", createdAt: new Date() }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindTokenByValue.mockResolvedValue(tokenRecord as Awaited<ReturnType<typeof findTokenByValue>>)
    mockGetActiveConsentTermVersion.mockResolvedValue(activeVersion as Awaited<ReturnType<typeof getActiveConsentTermVersion>>)
    mockFindExistingConsentEvent.mockResolvedValue(null)
  })

  it("creates accepted consent record when no existing acceptance", async () => {
    await acceptConsentFromHealthSurveyToken(HEALTH_SURVEY_TOKEN)

    expect(mockCreateConsentRecord).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      event: "accepted",
    }))
  })

  it("skips creating record when consent already accepted", async () => {
    mockFindExistingConsentEvent.mockResolvedValue({ id: "existing" } as Awaited<ReturnType<typeof findExistingConsentEvent>>)

    await acceptConsentFromHealthSurveyToken(HEALTH_SURVEY_TOKEN)

    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("throws INVALID_TOKEN when token not found", async () => {
    mockFindTokenByValue.mockResolvedValue(null)

    await expect(acceptConsentFromHealthSurveyToken(HEALTH_SURVEY_TOKEN)).rejects.toMatchObject({ code: "INVALID_TOKEN" })
  })

  it("throws TOKEN_USED when token already used", async () => {
    mockFindTokenByValue.mockResolvedValue({ ...tokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findTokenByValue>>)

    await expect(acceptConsentFromHealthSurveyToken(HEALTH_SURVEY_TOKEN)).rejects.toMatchObject({ code: "TOKEN_USED" })
  })
})

describe("refuseConsentFromHealthSurveyToken", () => {
  const HEALTH_SURVEY_TOKEN = "health-survey-token-refuse"
  const tokenRecord = {
    id: "token-2",
    tenantId: TENANT_ID,
    employeeId: EMPLOYEE_ID,
    token: HEALTH_SURVEY_TOKEN,
    usedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
  }
  const activeVersion = { id: TERM_VERSION_ID, version: "1.0", content: TERMS_CONTENT, isActive: true, contentHash: "hash123", createdAt: new Date() }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindTokenByValue.mockResolvedValue(tokenRecord as Awaited<ReturnType<typeof findTokenByValue>>)
    mockGetActiveConsentTermVersion.mockResolvedValue(activeVersion as Awaited<ReturnType<typeof getActiveConsentTermVersion>>)
  })

  it("creates refused consent record with correct fields", async () => {
    await refuseConsentFromHealthSurveyToken(HEALTH_SURVEY_TOKEN)

    expect(mockCreateConsentRecord).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      event: "refused",
    }))
  })

  it("marks the health survey token as used after refusal", async () => {
    await refuseConsentFromHealthSurveyToken(HEALTH_SURVEY_TOKEN)

    expect(mockMarkTokenUsed).toHaveBeenCalledWith(tokenRecord.tenantId, tokenRecord.id)
  })

  it("throws INVALID_TOKEN when token not found", async () => {
    mockFindTokenByValue.mockResolvedValue(null)

    await expect(refuseConsentFromHealthSurveyToken(HEALTH_SURVEY_TOKEN)).rejects.toMatchObject({ code: "INVALID_TOKEN" })
  })

  it("throws TOKEN_USED when token already used", async () => {
    mockFindTokenByValue.mockResolvedValue({ ...tokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findTokenByValue>>)

    await expect(refuseConsentFromHealthSurveyToken(HEALTH_SURVEY_TOKEN)).rejects.toMatchObject({ code: "TOKEN_USED" })
  })
})
