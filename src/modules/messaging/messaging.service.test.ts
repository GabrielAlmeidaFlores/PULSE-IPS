import { describe, it, expect, vi, beforeEach } from "vitest"
import { MessagingTemporaryError } from "@/libs/integrations/messaging/messaging-temporary-error"
import {
  applyMessageDeliveryStatus,
  normalizeProviderDeliveryStatus,
  processOutboundSurveyMessage,
  recordOutboundSurveyMessageFinalFailure,
} from "@/modules/messaging/messaging.service"
import {
  createMessageLog,
  findMessageLogByExternalId,
  findMessageLogByQueueJobId,
  updateMessageLogStatusById,
} from "@/modules/messaging/message-log.repository"
import { getMessagingService } from "@/libs/integrations"
import type { SendMessageJobData } from "@/libs/queue"

vi.mock("@/modules/messaging/message-log.repository")
vi.mock("@/libs/integrations", () => ({
  getMessagingService: vi.fn(),
}))

const mockCreateMessageLog = vi.mocked(createMessageLog)
const mockFindByExternalId = vi.mocked(findMessageLogByExternalId)
const mockFindByQueueJobId = vi.mocked(findMessageLogByQueueJobId)
const mockUpdateStatus = vi.mocked(updateMessageLogStatusById)
const mockGetMessagingService = vi.mocked(getMessagingService)

const mockSendClimateSurveyDispatch = vi.fn()
const MOCK_MESSAGING = {
  sendHealthSurveyDispatch: vi.fn(),
  sendHealthSurveyReminder: vi.fn(),
  sendClimateSurveyDispatch: mockSendClimateSurveyDispatch,
  sendClimateSurveyReminder: vi.fn(),
}

const EXTERNAL_ID = "ext-1"
const DELIVERED_AT = new Date("2026-08-11T12:05:00Z")
const READ_AT = new Date("2026-08-11T12:10:00Z")
const MESSAGE_LOG_ID = "log-1"
const CLIMATE_DISPATCH_TYPE = "climate_survey_dispatch"
const TENANT_ID = "tenant-1"
const EMPLOYEE_ID = "emp-1"
const DISPATCH_ID = "dispatch-1"
const PROVIDER = "smsbarato-wa"
const QUEUE_JOB_ID = "job-1"

const JOB_DATA: SendMessageJobData = {
  recipientPhone: "+5511999999999",
  recipientName: "Ana Silva",
  orgName: "Acme",
  surveyLink: "http://localhost:3000/climate-survey/acme/1234567",
  tenantId: TENANT_ID,
  employeeId: EMPLOYEE_ID,
  provider: PROVIDER,
  type: CLIMATE_DISPATCH_TYPE,
  dispatchId: DISPATCH_ID,
}

const MESSAGE_LOG = {
  id: MESSAGE_LOG_ID,
  tenantId: TENANT_ID,
  employeeId: EMPLOYEE_ID,
  dispatchId: DISPATCH_ID,
  type: CLIMATE_DISPATCH_TYPE,
  provider: PROVIDER,
  externalId: EXTERNAL_ID,
  surveyLink: JOB_DATA.surveyLink,
  status: "sent",
  errorMessage: null,
  queueJobId: QUEUE_JOB_ID,
  sentAt: new Date("2026-08-11T12:00:00Z"),
  deliveredAt: null,
  readAt: null,
  failedAt: null,
  updatedAt: new Date("2026-08-11T12:00:00Z"),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMessagingService.mockReturnValue(MOCK_MESSAGING as ReturnType<typeof getMessagingService>)
  mockCreateMessageLog.mockResolvedValue(MESSAGE_LOG as Awaited<ReturnType<typeof createMessageLog>>)
  mockFindByExternalId.mockResolvedValue(MESSAGE_LOG as Awaited<ReturnType<typeof findMessageLogByExternalId>>)
  mockFindByQueueJobId.mockResolvedValue(null)
  mockUpdateStatus.mockResolvedValue(MESSAGE_LOG as Awaited<ReturnType<typeof updateMessageLogStatusById>>)
  mockSendClimateSurveyDispatch.mockResolvedValue({ externalId: EXTERNAL_ID, status: "sent" })
})

describe("processOutboundSurveyMessage", () => {
  it("registra log completo com link único e dispatchId ao enviar", async () => {
    await processOutboundSurveyMessage({ data: JOB_DATA, queueJobId: QUEUE_JOB_ID })

    expect(mockSendClimateSurveyDispatch).toHaveBeenCalledWith({
      recipientPhone: JOB_DATA.recipientPhone,
      recipientName: JOB_DATA.recipientName,
      orgName: JOB_DATA.orgName,
      surveyLink: JOB_DATA.surveyLink,
    })
    expect(mockCreateMessageLog).toHaveBeenCalledWith(TENANT_ID, {
      employeeId: EMPLOYEE_ID,
      type: CLIMATE_DISPATCH_TYPE,
      provider: PROVIDER,
      status: "sent",
      surveyLink: JOB_DATA.surveyLink,
      dispatchId: DISPATCH_ID,
      externalId: EXTERNAL_ID,
      queueJobId: QUEUE_JOB_ID,
    })
  })

  it("propaga MessagingTemporaryError para reenvio automático", async () => {
    mockSendClimateSurveyDispatch.mockRejectedValueOnce(new MessagingTemporaryError("timeout"))

    await expect(processOutboundSurveyMessage({ data: JOB_DATA, queueJobId: QUEUE_JOB_ID })).rejects.toBeInstanceOf(
      MessagingTemporaryError,
    )
    expect(mockCreateMessageLog).not.toHaveBeenCalled()
  })

  it("registra falha permanente sem lançar", async () => {
    mockSendClimateSurveyDispatch.mockResolvedValueOnce({
      externalId: null,
      status: "failed",
      error: "ERRO: número inválido",
    })

    await processOutboundSurveyMessage({ data: JOB_DATA, queueJobId: QUEUE_JOB_ID })

    expect(mockCreateMessageLog).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        status: "failed",
        errorMessage: "ERRO: número inválido",
        failedAt: expect.any(Date) as Date,
      }),
    )
  })
})

describe("recordOutboundSurveyMessageFinalFailure", () => {
  it("não duplica log quando já existe para o job", async () => {
    mockFindByQueueJobId.mockResolvedValueOnce(MESSAGE_LOG as Awaited<ReturnType<typeof findMessageLogByQueueJobId>>)

    await recordOutboundSurveyMessageFinalFailure(JOB_DATA, QUEUE_JOB_ID, "timeout")

    expect(mockCreateMessageLog).not.toHaveBeenCalled()
  })

  it("cria log failed após esgotar retentativas", async () => {
    await recordOutboundSurveyMessageFinalFailure(JOB_DATA, QUEUE_JOB_ID, "timeout")

    expect(mockCreateMessageLog).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        status: "failed",
        errorMessage: "timeout",
        queueJobId: QUEUE_JOB_ID,
        dispatchId: DISPATCH_ID,
        surveyLink: JOB_DATA.surveyLink,
      }),
    )
  })
})

describe("applyMessageDeliveryStatus", () => {
  it("atualiza para delivered", async () => {
    await applyMessageDeliveryStatus({
      externalId: EXTERNAL_ID,
      status: "delivered",
      occurredAt: DELIVERED_AT,
    })

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      MESSAGE_LOG_ID,
      expect.objectContaining({
        status: "delivered",
        deliveredAt: DELIVERED_AT,
      }),
    )
  })

  it("atualiza para read e preenche deliveredAt se ausente", async () => {
    await applyMessageDeliveryStatus({
      externalId: EXTERNAL_ID,
      status: "read",
      occurredAt: READ_AT,
    })

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      MESSAGE_LOG_ID,
      expect.objectContaining({
        status: "read",
        readAt: READ_AT,
        deliveredAt: READ_AT,
      }),
    )
  })

  it("não regride status de read para delivered", async () => {
    mockFindByExternalId.mockResolvedValueOnce({
      ...MESSAGE_LOG,
      status: "read",
      readAt: READ_AT,
    } as Awaited<ReturnType<typeof findMessageLogByExternalId>>)

    const result = await applyMessageDeliveryStatus({
      externalId: EXTERNAL_ID,
      status: "delivered",
    })

    expect(mockUpdateStatus).not.toHaveBeenCalled()
    expect(result?.status).toBe("read")
  })
})

describe("normalizeProviderDeliveryStatus", () => {
  it("mapeia status do provedor para o domínio", () => {
    expect(normalizeProviderDeliveryStatus("enviado")).toBe("sent")
    expect(normalizeProviderDeliveryStatus("delivered")).toBe("delivered")
    expect(normalizeProviderDeliveryStatus("lido")).toBe("read")
    expect(normalizeProviderDeliveryStatus("SendingError")).toBe("failed")
    expect(normalizeProviderDeliveryStatus("unknown")).toBeNull()
  })
})
