import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createConsentRecord,
  findConsentByToken,
  findExistingConsentEvent,
  getActiveConsentTermVersion,
  findEmployeeForConsent,
  createConsentTermVersion,
} from "@/modules/consent/consent.repository"
import { findTokenByValue, markTokenUsed } from "@/modules/surveys/survey.repository"
import {
  sendConsentInvite,
  recordAcceptance,
  recordRefusal,
  optOut,
  optOutFromSurveyToken,
  publishNewConsentTermVersion,
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

vi.mock("@/modules/surveys/survey.repository", () => ({
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
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as never)
  })

  it("creates an invited consent record", async () => {
    await sendConsentInvite(TENANT_ID, EMPLOYEE_ID)

    expect(mockCreateConsentRecord).toHaveBeenCalledOnce()
    const call = mockCreateConsentRecord.mock.calls[0]?.[0]
    expect(call?.event).toBe("invited")
    expect(call?.source).toBe("sms_link")
    expect(call?.tenantId).toBe(TENANT_ID)
    expect(call?.employeeId).toBe(EMPLOYEE_ID)
    expect(call?.consentTermVersionId).toBe(TERM_VERSION_ID)
  })

  it("throws NO_ACTIVE_TERMS when no active term version", async () => {
    mockGetActiveConsentTermVersion.mockResolvedValue(null)

    await expect(sendConsentInvite(TENANT_ID, EMPLOYEE_ID)).rejects.toMatchObject({
      code: "NO_ACTIVE_TERMS",
    })
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("throws EMPLOYEE_NOT_FOUND when employee does not exist", async () => {
    mockFindEmployeeForConsent.mockResolvedValue(null)

    await expect(sendConsentInvite(TENANT_ID, EMPLOYEE_ID)).rejects.toMatchObject({
      code: "EMPLOYEE_NOT_FOUND",
    })
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("generates a unique token per invite", async () => {
    await sendConsentInvite(TENANT_ID, EMPLOYEE_ID)
    await sendConsentInvite(TENANT_ID, EMPLOYEE_ID)

    const token1 = mockCreateConsentRecord.mock.calls[0]?.[0]?.token
    const token2 = mockCreateConsentRecord.mock.calls[1]?.[0]?.token
    expect(token1).toBeDefined()
    expect(token2).toBeDefined()
    expect(token1).not.toBe(token2)
  })
})

describe("recordAcceptance — LGPD append-only rule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindConsentByToken.mockResolvedValue(baseConsentInvite as never)
    mockFindExistingConsentEvent.mockResolvedValue(null)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as never)
  })

  it("creates an accepted consent record", async () => {
    await recordAcceptance(INVITE_TOKEN)

    expect(mockCreateConsentRecord).toHaveBeenCalledOnce()
    const call = mockCreateConsentRecord.mock.calls[0]?.[0]
    expect(call?.event).toBe("accepted")
    expect(call?.tenantId).toBe(TENANT_ID)
    expect(call?.employeeId).toBe(EMPLOYEE_ID)
  })

  it("stores cpfHash when provided", async () => {
    await recordAcceptance(INVITE_TOKEN, "hashed-cpf-value")

    const call = mockCreateConsentRecord.mock.calls[0]?.[0]
    expect(call?.cpfHash).toBe("hashed-cpf-value")
  })

  it("does NOT store cpfHash when not provided", async () => {
    await recordAcceptance(INVITE_TOKEN)

    const call = mockCreateConsentRecord.mock.calls[0]?.[0]
    expect(call?.cpfHash).toBeUndefined()
  })

  it("throws TOKEN_INVALID when token does not exist", async () => {
    mockFindConsentByToken.mockResolvedValue(null)

    await expect(recordAcceptance(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_INVALID" })
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("throws TOKEN_EXPIRED when token is past expiry", async () => {
    mockFindConsentByToken.mockResolvedValue({
      ...baseConsentInvite,
      tokenExpiresAt: new Date(Date.now() - 1000),
    } as never)

    await expect(recordAcceptance(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" })
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })

  it("throws TOKEN_USED when already accepted or refused — enforces append-only uniqueness", async () => {
    mockFindExistingConsentEvent.mockResolvedValue({ ...baseConsentInvite, event: "accepted" } as never)

    await expect(recordAcceptance(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_USED" })
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
    mockFindConsentByToken.mockResolvedValue(baseConsentInvite as never)
    mockFindExistingConsentEvent.mockResolvedValue(null)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as never)
  })

  it("creates a refused consent record", async () => {
    await recordRefusal(INVITE_TOKEN)

    const call = mockCreateConsentRecord.mock.calls[0]?.[0]
    expect(call?.event).toBe("refused")
    expect(call?.tenantId).toBe(TENANT_ID)
    expect(call?.employeeId).toBe(EMPLOYEE_ID)
  })

  it("throws TOKEN_INVALID when token does not exist", async () => {
    mockFindConsentByToken.mockResolvedValue(null)
    await expect(recordRefusal(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_INVALID" })
  })

  it("throws TOKEN_EXPIRED when token is past expiry", async () => {
    mockFindConsentByToken.mockResolvedValue({
      ...baseConsentInvite,
      tokenExpiresAt: new Date(Date.now() - 1000),
    } as never)
    await expect(recordRefusal(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" })
  })

  it("throws TOKEN_USED when already responded", async () => {
    mockFindExistingConsentEvent.mockResolvedValue({ ...baseConsentInvite, event: "refused" } as never)
    await expect(recordRefusal(INVITE_TOKEN)).rejects.toMatchObject({ code: "TOKEN_USED" })
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })
})

describe("optOut — LGPD opt-out flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActiveConsentTermVersion.mockResolvedValue(activeTermVersion)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as never)
  })

  it("creates an opted_out consent record", async () => {
    await optOut(TENANT_ID, EMPLOYEE_ID)

    const call = mockCreateConsentRecord.mock.calls[0]?.[0]
    expect(call?.event).toBe("opted_out")
    expect(call?.source).toBe("survey_form")
    expect(call?.tenantId).toBe(TENANT_ID)
    expect(call?.employeeId).toBe(EMPLOYEE_ID)
  })

  it("throws NO_ACTIVE_TERMS when no active term version", async () => {
    mockGetActiveConsentTermVersion.mockResolvedValue(null)
    await expect(optOut(TENANT_ID, EMPLOYEE_ID)).rejects.toMatchObject({ code: "NO_ACTIVE_TERMS" })
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })
})

describe("optOutFromSurveyToken — opt-out via survey link", () => {
  const surveyToken = "survey-token-xyz"
  const tokenRecord = {
    id: "token-id-1",
    tenantId: TENANT_ID,
    employeeId: EMPLOYEE_ID,
    usedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindTokenByValue.mockResolvedValue(tokenRecord as never)
    mockGetActiveConsentTermVersion.mockResolvedValue(activeTermVersion)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite as never)
    mockMarkTokenUsed.mockResolvedValue(undefined as never)
  })

  it("creates opted_out record and marks token used", async () => {
    await optOutFromSurveyToken(surveyToken)

    const consentCall = mockCreateConsentRecord.mock.calls[0]?.[0]
    expect(consentCall?.event).toBe("opted_out")
    expect(consentCall?.source).toBe("survey_form")
    expect(mockMarkTokenUsed).toHaveBeenCalledWith(tokenRecord.id)
  })

  it("throws TOKEN_INVALID when survey token not found", async () => {
    mockFindTokenByValue.mockResolvedValue(null)
    await expect(optOutFromSurveyToken(surveyToken)).rejects.toMatchObject({ code: "INVALID_TOKEN" })
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
    expect(mockMarkTokenUsed).not.toHaveBeenCalled()
  })

  it("throws TOKEN_USED when survey token already used", async () => {
    mockFindTokenByValue.mockResolvedValue({ ...tokenRecord, usedAt: new Date() } as never)
    await expect(optOutFromSurveyToken(surveyToken)).rejects.toMatchObject({ code: "TOKEN_USED" })
    expect(mockCreateConsentRecord).not.toHaveBeenCalled()
  })
})

describe("publishNewConsentTermVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateConsentTermVersion.mockResolvedValue(activeTermVersion)
  })

  it("creates a new term version", async () => {
    await publishNewConsentTermVersion({ version: "2.0", content: "Novo conteúdo" })
    expect(mockCreateConsentTermVersion).toHaveBeenCalledWith({ version: "2.0", content: "Novo conteúdo" })
  })

  it("trims whitespace from version and content", async () => {
    await publishNewConsentTermVersion({ version: "  2.0  ", content: "  conteúdo  " })
    expect(mockCreateConsentTermVersion).toHaveBeenCalledWith({ version: "2.0", content: "conteúdo" })
  })

  it("throws INVALID_INPUT when version is blank", () => {
    expect(() => publishNewConsentTermVersion({ version: "   ", content: "conteúdo" })).toThrow(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    )
    expect(mockCreateConsentTermVersion).not.toHaveBeenCalled()
  })

  it("throws INVALID_INPUT when content is blank", () => {
    expect(() => publishNewConsentTermVersion({ version: "2.0", content: "  " })).toThrow(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    )
    expect(mockCreateConsentTermVersion).not.toHaveBeenCalled()
  })
})

describe("AppError structure", () => {
  it("exposes code and message correctly", () => {
    const err = new AppError("SOME_CODE", "mensagem de erro")
    expect(err.code).toBe("SOME_CODE")
    expect(err.message).toBe("mensagem de erro")
    expect(err.name).toBe("AppError")
    expect(err instanceof Error).toBe(true)
  })
})
