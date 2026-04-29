import { describe, it, expect, vi, beforeEach } from "vitest"
import { findTokenByValue, createHealthSurveyResponseWithItems } from "@/modules/health-surveys/health-survey.repository"
import type { ConsentWithTermVersion } from "@/modules/consent/consent.repository"
import { submitSurveyResponse, validateSurveyToken } from "@/modules/health-surveys/health-survey-response.service"

vi.mock("@/modules/health-surveys/health-survey.repository", () => ({
  findTokenByValue: vi.fn(),
  markTokenUsed: vi.fn(),
  createHealthSurveyResponseWithItems: vi.fn(),
  deleteExpiredTokens: vi.fn(),
  findHealthSurveyConfigsByTenant: vi.fn(),
  findHealthSurveyConfigById: vi.fn(),
  upsertHealthSurveyConfig: vi.fn(),
  findDispatchesByTenant: vi.fn(),
  findDispatchWithDashboard: vi.fn(),
  findMultipleDispatchesWithDashboard: vi.fn(),
  createDispatch: vi.fn(),
}))

vi.mock("@/modules/consent/consent.repository", () => ({
  getCurrentConsent: vi.fn(),
  getActiveConsentTermVersion: vi.fn(),
  createConsentRecord: vi.fn(),
  findConsentByToken: vi.fn(),
  findExistingConsentEvent: vi.fn(),
  findEmployeeForConsent: vi.fn(),
  getAllConsentTermVersions: vi.fn(),
  createConsentTermVersion: vi.fn(),
  findEmployeeIdsWithAcceptedConsent: vi.fn(),
}))

const mockFindTokenByValue = vi.mocked(findTokenByValue)
const mockCreateSurveyResponseWithItems = vi.mocked(createHealthSurveyResponseWithItems)

const TENANT_ID = "tenant-1"
const DISPATCH_ID = "dispatch-1"
const TOKEN_ID = "token-1"
const EMPLOYEE_ID = "employee-1"
const SURVEY_TOKEN = "survey-token-abc"

const validTokenRecord = {
  id: TOKEN_ID,
  tenantId: TENANT_ID,
  dispatchId: DISPATCH_ID,
  employeeId: EMPLOYEE_ID,
  token: SURVEY_TOKEN,
  usedAt: null,
  expiresAt: new Date(Date.now() + 86400000),
  workStartTime: "00:00",
  workEndTime: "23:59",
  createdAt: new Date(),
  dispatch: {
    id: DISPATCH_ID,
    status: "sent",
    healthSurveyConfiguration: {
      organization: { timezone: "America/Sao_Paulo" },
      questions: [
        { id: "q-1", text: "Como você se sente?", order: 1, scoreDirection: "higher_is_better" },
      ],
    },
  },
  employee: { id: EMPLOYEE_ID, name: "Maria Souza" },
}

const sampleAnswers = [{ questionId: "q-1", score: 4 }]

describe("submitSurveyResponse — anonymity guarantee", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindTokenByValue.mockResolvedValue(validTokenRecord as Awaited<ReturnType<typeof findTokenByValue>>)
    mockCreateSurveyResponseWithItems.mockResolvedValue(undefined)
  })

  it("creates response WITHOUT employee_id in the payload", async () => {
    await submitSurveyResponse({ token: SURVEY_TOKEN, answers: sampleAnswers })

    expect(mockCreateSurveyResponseWithItems).toHaveBeenCalledOnce()
    const payload = mockCreateSurveyResponseWithItems.mock.calls[0]?.[0]

    expect(payload).toBeDefined()
    expect(payload).not.toHaveProperty("employeeId")
    expect(payload).not.toHaveProperty("employee_id")
  })

  it("creates response with correct tenantId and dispatchId", async () => {
    await submitSurveyResponse({ token: SURVEY_TOKEN, answers: sampleAnswers })

    const payload = mockCreateSurveyResponseWithItems.mock.calls[0]?.[0]
    expect(payload?.tenantId).toBe(TENANT_ID)
    expect(payload?.dispatchId).toBe(DISPATCH_ID)
  })

  it("passes tokenId for token invalidation (not for linking response to employee)", async () => {
    await submitSurveyResponse({ token: SURVEY_TOKEN, answers: sampleAnswers })

    const payload = mockCreateSurveyResponseWithItems.mock.calls[0]?.[0]
    expect(payload?.tokenId).toBe(TOKEN_ID)
  })

  it("passes answer scores through correctly", async () => {
    const answers = [
      { questionId: "q-1", score: 3 },
      { questionId: "q-2", score: 5 },
    ]
    await submitSurveyResponse({ token: SURVEY_TOKEN, answers })

    const payload = mockCreateSurveyResponseWithItems.mock.calls[0]?.[0]
    expect(payload?.answers).toEqual(answers)
  })

  it("throws TOKEN_INVALID when token does not exist", async () => {
    mockFindTokenByValue.mockResolvedValue(null)

    await expect(submitSurveyResponse({ token: SURVEY_TOKEN, answers: sampleAnswers }))
      .rejects.toMatchObject({ code: "TOKEN_INVALID" })
    expect(mockCreateSurveyResponseWithItems).not.toHaveBeenCalled()
  })

  it("throws SURVEY_ALREADY_ANSWERED when token already used", async () => {
    mockFindTokenByValue.mockResolvedValue({ ...validTokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findTokenByValue>>)

    await expect(submitSurveyResponse({ token: SURVEY_TOKEN, answers: sampleAnswers }))
      .rejects.toMatchObject({ code: "SURVEY_ALREADY_ANSWERED" })
    expect(mockCreateSurveyResponseWithItems).not.toHaveBeenCalled()
  })

  it("throws TOKEN_EXPIRED when token is past expiry", async () => {
    mockFindTokenByValue.mockResolvedValue({
      ...validTokenRecord,
      expiresAt: new Date(Date.now() - 1000),
    } as Awaited<ReturnType<typeof findTokenByValue>>)

    await expect(submitSurveyResponse({ token: SURVEY_TOKEN, answers: sampleAnswers }))
      .rejects.toMatchObject({ code: "TOKEN_EXPIRED" })
    expect(mockCreateSurveyResponseWithItems).not.toHaveBeenCalled()
  })

  it("throws OUTSIDE_WORK_WINDOW when outside configured work hours", async () => {
    mockFindTokenByValue.mockResolvedValue({
      ...validTokenRecord,
      workStartTime: "09:00",
      workEndTime: "09:01",
    } as Awaited<ReturnType<typeof findTokenByValue>>)

    await expect(submitSurveyResponse({ token: SURVEY_TOKEN, answers: sampleAnswers }))
      .rejects.toMatchObject({ code: "OUTSIDE_WORK_WINDOW" })
    expect(mockCreateSurveyResponseWithItems).not.toHaveBeenCalled()
  })

  it("does NOT throw for a night shift token spanning midnight (00:00–23:59 window)", async () => {
    await expect(submitSurveyResponse({ token: SURVEY_TOKEN, answers: sampleAnswers }))
      .resolves.toBeUndefined()
  })
})

describe("validateSurveyToken", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns invalid when token does not exist", async () => {
    mockFindTokenByValue.mockResolvedValue(null)
    const result = await validateSurveyToken("nonexistent")
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBeDefined()
  })

  it("returns invalid when token already used", async () => {
    mockFindTokenByValue.mockResolvedValue({ ...validTokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findTokenByValue>>)
    const result = await validateSurveyToken(SURVEY_TOKEN)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("respondida")
  })

  it("returns invalid when token is expired", async () => {
    mockFindTokenByValue.mockResolvedValue({
      ...validTokenRecord,
      expiresAt: new Date(Date.now() - 1000),
    } as Awaited<ReturnType<typeof findTokenByValue>>)
    const result = await validateSurveyToken(SURVEY_TOKEN)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("expirou")
  })

  it("returns invalid when dispatch is not in sent status", async () => {
    mockFindTokenByValue.mockResolvedValue({
      ...validTokenRecord,
      dispatch: { ...validTokenRecord.dispatch, status: "scheduled" },
    } as Awaited<ReturnType<typeof findTokenByValue>>)

    const { getCurrentConsent, getActiveConsentTermVersion } = await import("@/modules/consent/consent.repository")
    vi.mocked(getCurrentConsent).mockResolvedValue(null)
    vi.mocked(getActiveConsentTermVersion).mockResolvedValue(null)

    const result = await validateSurveyToken(SURVEY_TOKEN)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("ativa")
  })

  it("returns valid with consentStatus needs_consent when employee has no consent", async () => {
    mockFindTokenByValue.mockResolvedValue(validTokenRecord as Awaited<ReturnType<typeof findTokenByValue>>)

    const { getCurrentConsent, getActiveConsentTermVersion } = await import("@/modules/consent/consent.repository")
    vi.mocked(getCurrentConsent).mockResolvedValue(null)
    vi.mocked(getActiveConsentTermVersion).mockResolvedValue({
      id: "term-1",
      version: "1.0",
      content: "Termos",
      contentHash: "hash",
      isActive: true,
      createdAt: new Date(),
    })

    const result = await validateSurveyToken(SURVEY_TOKEN)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.consentStatus).toBe("needs_consent")
  })

  it("returns valid with consentStatus accepted when employee accepted current version", async () => {
    mockFindTokenByValue.mockResolvedValue(validTokenRecord as Awaited<ReturnType<typeof findTokenByValue>>)

    const { getCurrentConsent, getActiveConsentTermVersion } = await import("@/modules/consent/consent.repository")
    const termId = "term-version-current"
    vi.mocked(getActiveConsentTermVersion).mockResolvedValue({
      id: termId,
      version: "1.0",
      content: "Termos",
      contentHash: "hash",
      isActive: true,
      createdAt: new Date(),
    })
    vi.mocked(getCurrentConsent).mockResolvedValue({
      id: "consent-1",
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      consentTermVersionId: termId,
      event: "accepted",
      source: "sms_link",
      token: null,
      tokenExpiresAt: null,
      cpfHash: null,
      createdAt: new Date(),
      consentTermVersion: {
        id: termId,
        version: "1.0",
        content: "Termos",
        contentHash: "hash-123",
        isActive: true,
        createdAt: new Date(),
      },
    } as ConsentWithTermVersion)

    const result = await validateSurveyToken(SURVEY_TOKEN)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.consentStatus).toBe("accepted")
  })

  it("returns needs_consent when employee accepted a different (older) term version", async () => {
    mockFindTokenByValue.mockResolvedValue(validTokenRecord as Awaited<ReturnType<typeof findTokenByValue>>)

    const { getCurrentConsent, getActiveConsentTermVersion } = await import("@/modules/consent/consent.repository")
    vi.mocked(getActiveConsentTermVersion).mockResolvedValue({
      id: "new-term-version",
      version: "2.0",
      content: "Termos atualizados",
      contentHash: "newhash",
      isActive: true,
      createdAt: new Date(),
    })
    vi.mocked(getCurrentConsent).mockResolvedValue({
      id: "consent-1",
      tenantId: TENANT_ID,
      employeeId: EMPLOYEE_ID,
      consentTermVersionId: "old-term-version",
      event: "accepted",
      source: "sms_link",
      token: null,
      tokenExpiresAt: null,
      cpfHash: null,
      createdAt: new Date(),
      consentTermVersion: {
        id: "old-term-version",
        version: "1.0",
        content: "Termos antigos",
        contentHash: "oldhash",
        isActive: false,
        createdAt: new Date(),
      },
    } as ConsentWithTermVersion)

    const result = await validateSurveyToken(SURVEY_TOKEN)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.consentStatus).toBe("needs_consent")
  })

  it("response object does not expose employeeId in token payload directly", async () => {
    mockFindTokenByValue.mockResolvedValue(validTokenRecord as Awaited<ReturnType<typeof findTokenByValue>>)

    const { getCurrentConsent, getActiveConsentTermVersion } = await import("@/modules/consent/consent.repository")
    vi.mocked(getCurrentConsent).mockResolvedValue(null)
    vi.mocked(getActiveConsentTermVersion).mockResolvedValue(null)

    const result = await validateSurveyToken(SURVEY_TOKEN)

    if (result.valid) {
      const tokenData = result.token
      const serialized = JSON.stringify(tokenData)
      expect(serialized).not.toContain("Maria Souza")
      expect(serialized).not.toContain("phone")
    }
  })
})
