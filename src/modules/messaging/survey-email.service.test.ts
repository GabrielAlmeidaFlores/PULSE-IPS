import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  processOutboundSurveyEmail,
  recordOutboundSurveyEmailFinalFailure,
  registerEmailClick,
  registerEmailOpen,
} from "@/modules/messaging/survey-email.service"
import {
  createEmailLog,
  findEmailLogByQueueJobId,
  findEmailLogByTrackingToken,
  markEmailLogClicked,
  markEmailLogOpened,
} from "@/modules/messaging/email-log.repository"
import { getEmailService } from "@/libs/integrations"
import { renderEmailTemplate } from "@/libs/email-templates"
import type { SendEmailJobData } from "@/libs/queue"

vi.mock("@/modules/messaging/email-log.repository")
vi.mock("@/modules/climate-surveys/climate-survey-analytics.service", () => ({
  recordClimateSurveyEmailOpened: vi.fn(),
  recordClimateSurveyLinkClicked: vi.fn(),
}))
vi.mock("@/libs/integrations", () => ({
  getEmailService: vi.fn(),
}))
vi.mock("@/libs/email-templates", () => ({
  renderEmailTemplate: vi.fn(() => "<html>ok</html>"),
}))
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}))

const mockCreateEmailLog = vi.mocked(createEmailLog)
const mockFindByTrackingToken = vi.mocked(findEmailLogByTrackingToken)
const mockFindByQueueJobId = vi.mocked(findEmailLogByQueueJobId)
const mockMarkOpened = vi.mocked(markEmailLogOpened)
const mockMarkClicked = vi.mocked(markEmailLogClicked)
const mockGetEmailService = vi.mocked(getEmailService)
const mockRenderEmailTemplate = vi.mocked(renderEmailTemplate)

const mockSend = vi.fn()
const TENANT_ID = "tenant-1"
const EMPLOYEE_ID = "emp-1"
const DISPATCH_ID = "dispatch-1"
const QUEUE_JOB_ID = "job-1"
const TRACKING_TOKEN = "11111111-1111-1111-1111-111111111111"
const SURVEY_LINK = "http://localhost:3000/climate-survey/acme/1234567"

const JOB_DATA: SendEmailJobData = {
  recipientEmail: "ana@acme.com",
  recipientName: "Ana Silva",
  orgName: "Acme",
  surveyLink: SURVEY_LINK,
  tenantId: TENANT_ID,
  employeeId: EMPLOYEE_ID,
  provider: "console",
  type: "climate_survey_dispatch",
  tokenExpiryHours: 48,
  dispatchId: DISPATCH_ID,
}

const EMAIL_LOG = {
  id: "log-1",
  tenantId: TENANT_ID,
  employeeId: EMPLOYEE_ID,
  dispatchId: DISPATCH_ID,
  type: "climate_survey_dispatch",
  provider: "console",
  externalId: "ext-1",
  recipientEmail: JOB_DATA.recipientEmail,
  surveyLink: SURVEY_LINK,
  trackingToken: TRACKING_TOKEN,
  status: "sent",
  errorMessage: null,
  queueJobId: QUEUE_JOB_ID,
  sentAt: new Date("2026-08-11T12:00:00Z"),
  openedAt: null,
  clickedAt: null,
  failedAt: null,
  updatedAt: new Date("2026-08-11T12:00:00Z"),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetEmailService.mockReturnValue({ send: mockSend } as ReturnType<typeof getEmailService>)
  mockSend.mockResolvedValue({ id: "ext-1" })
  mockCreateEmailLog.mockResolvedValue(EMAIL_LOG as Awaited<ReturnType<typeof createEmailLog>>)
  mockFindByTrackingToken.mockResolvedValue(EMAIL_LOG as Awaited<ReturnType<typeof findEmailLogByTrackingToken>>)
  mockFindByQueueJobId.mockResolvedValue(null)
  mockMarkOpened.mockResolvedValue({
    ...EMAIL_LOG,
    status: "opened",
    openedAt: new Date("2026-08-11T12:01:00Z"),
  } as Awaited<ReturnType<typeof markEmailLogOpened>>)
  mockMarkClicked.mockResolvedValue({
    ...EMAIL_LOG,
    status: "clicked",
    openedAt: new Date("2026-08-11T12:01:00Z"),
    clickedAt: new Date("2026-08-11T12:02:00Z"),
  } as Awaited<ReturnType<typeof markEmailLogClicked>>)
})

describe("processOutboundSurveyEmail", () => {
  it("renderiza template com link de clique e pixel de abertura", async () => {
    await processOutboundSurveyEmail({ data: JOB_DATA, queueJobId: QUEUE_JOB_ID })

    expect(mockRenderEmailTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "climate-survey-dispatch",
        props: expect.objectContaining({
          employeeName: "Ana Silva",
          orgName: "Acme",
          expiryHours: "48",
          surveyUrl: expect.stringMatching(/\/api\/track\/email\/.+\/click$/) as string,
          openPixelUrl: expect.stringMatching(/\/api\/track\/email\/.+\/open$/) as string,
        }) as Record<string, string>,
      }),
    )
    expect(mockSend).toHaveBeenCalledWith({
      to: "ana@acme.com",
      subject: "Sua pesquisa de clima — Acme",
      html: "<html>ok</html>",
    })
    expect(mockCreateEmailLog).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        employeeId: EMPLOYEE_ID,
        type: "climate_survey_dispatch",
        status: "sent",
        surveyLink: SURVEY_LINK,
        dispatchId: DISPATCH_ID,
        externalId: "ext-1",
        queueJobId: QUEUE_JOB_ID,
      }),
    )
  })

  it("usa template e assunto de lembrete", async () => {
    await processOutboundSurveyEmail({
      data: { ...JOB_DATA, type: "climate_survey_reminder" },
      queueJobId: QUEUE_JOB_ID,
    })

    expect(mockRenderEmailTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "climate-survey-reminder" }),
    )
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Lembrete: pesquisa de clima ainda aberta — Acme",
      }),
    )
  })

  it("registra falha permanente quando o provedor retorna erro", async () => {
    mockSend.mockResolvedValueOnce({ id: "", error: "destinatário inválido" })

    await processOutboundSurveyEmail({ data: JOB_DATA, queueJobId: QUEUE_JOB_ID })

    expect(mockCreateEmailLog).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        status: "failed",
        errorMessage: "destinatário inválido",
        failedAt: expect.any(Date) as Date,
      }),
    )
  })

  it("propaga erro transitório sem gravar log para permitir retentativa", async () => {
    mockSend.mockRejectedValueOnce(new Error("timeout"))

    await expect(processOutboundSurveyEmail({ data: JOB_DATA, queueJobId: QUEUE_JOB_ID })).rejects.toThrow("timeout")
    expect(mockCreateEmailLog).not.toHaveBeenCalled()
  })
})

describe("recordOutboundSurveyEmailFinalFailure", () => {
  it("não duplica log quando já existe para o job", async () => {
    mockFindByQueueJobId.mockResolvedValueOnce(EMAIL_LOG as Awaited<ReturnType<typeof findEmailLogByQueueJobId>>)

    await recordOutboundSurveyEmailFinalFailure(JOB_DATA, QUEUE_JOB_ID, "timeout")

    expect(mockCreateEmailLog).not.toHaveBeenCalled()
  })

  it("cria log failed após esgotar retentativas", async () => {
    await recordOutboundSurveyEmailFinalFailure(JOB_DATA, QUEUE_JOB_ID, "timeout")

    expect(mockCreateEmailLog).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        status: "failed",
        errorMessage: "timeout",
        queueJobId: QUEUE_JOB_ID,
        failedAt: expect.any(Date) as Date,
      }),
    )
  })
})

describe("registerEmailOpen", () => {
  it("marca abertura na primeira vez", async () => {
    const result = await registerEmailOpen(TRACKING_TOKEN)

    expect(mockMarkOpened).toHaveBeenCalledWith(EMAIL_LOG.id, expect.any(Date) as Date)
    expect(result?.status).toBe("opened")
  })

  it("não remarca abertura já registrada", async () => {
    mockFindByTrackingToken.mockResolvedValueOnce({
      ...EMAIL_LOG,
      status: "opened",
      openedAt: new Date(),
    } as Awaited<ReturnType<typeof findEmailLogByTrackingToken>>)

    const result = await registerEmailOpen(TRACKING_TOKEN)

    expect(mockMarkOpened).not.toHaveBeenCalled()
    expect(result?.status).toBe("opened")
  })

  it("retorna null quando token não existe", async () => {
    mockFindByTrackingToken.mockResolvedValueOnce(null)

    await expect(registerEmailOpen(TRACKING_TOKEN)).resolves.toBeNull()
  })
})

describe("registerEmailClick", () => {
  it("marca clique e abertura implícita quando ainda não abriu", async () => {
    const result = await registerEmailClick(TRACKING_TOKEN)

    expect(mockMarkClicked).toHaveBeenCalledWith(EMAIL_LOG.id, expect.any(Date) as Date, null)
    expect(result?.status).toBe("clicked")
  })

  it("não remarca clique já registrado", async () => {
    mockFindByTrackingToken.mockResolvedValueOnce({
      ...EMAIL_LOG,
      status: "clicked",
      clickedAt: new Date(),
    } as Awaited<ReturnType<typeof findEmailLogByTrackingToken>>)

    const result = await registerEmailClick(TRACKING_TOKEN)

    expect(mockMarkClicked).not.toHaveBeenCalled()
    expect(result?.status).toBe("clicked")
  })
})
