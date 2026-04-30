import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createConsentRecord,
  findExistingConsentEvent,
  getActiveConsentTermVersion,
  createConsentTermVersion,
  getAllConsentTermVersions,
  findLatestConsentEventsByEmployeeIds,
  findEmployeeIdsForConsentState,
} from "@/modules/consent/consent.repository"
import { findHealthSurveyTokenByValue, markHealthSurveyTokenUsed } from "@/modules/health-surveys/health-survey.repository"
import {
  optOut,
  optOutFromHealthSurveyToken,
  publishNewConsentTermVersion,
  getActiveTermVersion,
  acceptConsentFromHealthSurveyToken,
  refuseConsentFromHealthSurveyToken,
  listAllConsentTermVersions,
  getConsentEventsByEmployeeIds,
  getEmployeeIdsForConsentState,
} from "@/modules/consent/consent.service"
import { AppError } from "@/libs/errors/app-error"

vi.mock("@/modules/consent/consent.repository", () => ({
  createConsentRecord: vi.fn(),
  findExistingConsentEvent: vi.fn(),
  getActiveConsentTermVersion: vi.fn(),
  getAllConsentTermVersions: vi.fn(),
  createConsentTermVersion: vi.fn(),
  getCurrentConsent: vi.fn(),
  findEmployeeIdsWithAcceptedConsent: vi.fn(),
  findLatestConsentEventsByEmployeeIds: vi.fn(),
  findEmployeeIdsForConsentState: vi.fn(),
}))

vi.mock("@/modules/health-surveys/health-survey.repository", () => ({
  findHealthSurveyTokenByValue: vi.fn(),
  markHealthSurveyTokenUsed: vi.fn(),
}))

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    MESSAGING_PROVIDER: "console",
  },
}))

const mockCreateConsentRecord = vi.mocked(createConsentRecord)
const mockFindExistingConsentEvent = vi.mocked(findExistingConsentEvent)
const mockGetActiveConsentTermVersion = vi.mocked(getActiveConsentTermVersion)
const mockCreateConsentTermVersion = vi.mocked(createConsentTermVersion)
const mockGetAllConsentTermVersions = vi.mocked(getAllConsentTermVersions)
const mockFindLatestConsentEvents = vi.mocked(findLatestConsentEventsByEmployeeIds)
const mockFindEmployeeIdsForConsentState = vi.mocked(findEmployeeIdsForConsentState)
const mockFindTokenByValue = vi.mocked(findHealthSurveyTokenByValue)
const mockMarkTokenUsed = vi.mocked(markHealthSurveyTokenUsed)

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
  source: "message_link",
  token: INVITE_TOKEN,
  tokenExpiresAt: new Date(Date.now() + 86400000),
  documentHash: null,
  createdAt: new Date(),
}

describe("optOut — LGPD opt-out flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActiveConsentTermVersion.mockResolvedValue(activeTermVersion)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite)
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
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindTokenByValue.mockResolvedValue(tokenRecord as Awaited<ReturnType<typeof findHealthSurveyTokenByValue>>)
    mockGetActiveConsentTermVersion.mockResolvedValue(activeTermVersion)
    mockCreateConsentRecord.mockResolvedValue(baseConsentInvite)
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
    mockFindTokenByValue.mockResolvedValue({ ...tokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findHealthSurveyTokenByValue>>)
    await expect(optOutFromHealthSurveyToken(healthSurveyToken)).rejects.toMatchObject({ code: "TOKEN_USED" })
  })

  it("does not create consent record when token is already used", async () => {
    mockFindTokenByValue.mockResolvedValue({ ...tokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findHealthSurveyTokenByValue>>)
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

describe("getActiveTermVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the active consent term version", async () => {
    const termVersion = { id: TERM_VERSION_ID, version: "1.0", content: TERMS_CONTENT, isActive: true, contentHash: "hash123", createdAt: new Date() }
    mockGetActiveConsentTermVersion.mockResolvedValue(termVersion)

    const result = await getActiveTermVersion()
    expect(result).toEqual(termVersion)
  })

  it("calls repository once to fetch active term version", async () => {
    const termVersion = { id: TERM_VERSION_ID, version: "1.0", content: TERMS_CONTENT, isActive: true, contentHash: "hash123", createdAt: new Date() }
    mockGetActiveConsentTermVersion.mockResolvedValue(termVersion)

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
    mockFindTokenByValue.mockResolvedValue(tokenRecord as Awaited<ReturnType<typeof findHealthSurveyTokenByValue>>)
    mockGetActiveConsentTermVersion.mockResolvedValue(activeVersion)
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
    mockFindTokenByValue.mockResolvedValue({ ...tokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findHealthSurveyTokenByValue>>)

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
    mockFindTokenByValue.mockResolvedValue(tokenRecord as Awaited<ReturnType<typeof findHealthSurveyTokenByValue>>)
    mockGetActiveConsentTermVersion.mockResolvedValue(activeVersion)
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
    mockFindTokenByValue.mockResolvedValue({ ...tokenRecord, usedAt: new Date() } as Awaited<ReturnType<typeof findHealthSurveyTokenByValue>>)

    await expect(refuseConsentFromHealthSurveyToken(HEALTH_SURVEY_TOKEN)).rejects.toMatchObject({ code: "TOKEN_USED" })
  })
})

describe("listAllConsentTermVersions", () => {
  it("delega ao repository e retorna lista de versões", async () => {
    const versions = [{ id: "v-1", version: "1.0.0", content: "Termos..." }]
    mockGetAllConsentTermVersions.mockResolvedValue(versions as Awaited<ReturnType<typeof getAllConsentTermVersions>>)

    const result = await listAllConsentTermVersions()

    expect(mockGetAllConsentTermVersions).toHaveBeenCalled()
    expect(result).toEqual(versions)
  })
})

describe("getConsentEventsByEmployeeIds", () => {
  it("delega ao repository e retorna map de eventos", async () => {
    const eventsMap = new Map([["emp-1", "accepted"], ["emp-2", "refused"]])
    mockFindLatestConsentEvents.mockResolvedValue(eventsMap)

    const result = await getConsentEventsByEmployeeIds("tenant-1", ["emp-1", "emp-2"])

    expect(mockFindLatestConsentEvents).toHaveBeenCalledWith("tenant-1", ["emp-1", "emp-2"])
    expect(result).toEqual(eventsMap)
  })
})

describe("getEmployeeIdsForConsentState", () => {
  it("delega ao repository e retorna ids filtrados por estado", async () => {
    mockFindEmployeeIdsForConsentState.mockResolvedValue(["emp-1", "emp-3"])

    const result = await getEmployeeIdsForConsentState("tenant-1", "accepted")

    expect(mockFindEmployeeIdsForConsentState).toHaveBeenCalledWith("tenant-1", "accepted")
    expect(result).toEqual(["emp-1", "emp-3"])
  })
})
