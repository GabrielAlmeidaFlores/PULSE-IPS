import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  requestAccountDeletionCode,
  confirmAccountDeletion,
  cancelScheduledOrganizationDeletion,
  runOrganizationDeletionExecutor,
} from "@/modules/organizations/account-deletion.service"
import {
  createAccountDeletionToken,
  findAccountDeletionToken,
  consumeAccountDeletionToken,
  scheduleOrganizationDeletion,
  cancelOrganizationDeletionSchedule,
  findAllTenantsScheduledForDeletion,
  executeOrganizationDeletion,
} from "@/modules/organizations/account-deletion.repository"
import { findOrganizationById } from "@/modules/organizations/organization.repository"
import { findSubscriptionByTenantId } from "@/modules/billing/billing.repository"
import { getEmailService, getBillingService } from "@/libs/integrations"
import type { IBillingService } from "@/libs/integrations/billing/billing.interface"

vi.mock("@/modules/organizations/account-deletion.repository")
vi.mock("@/modules/organizations/organization.repository")
vi.mock("@/modules/billing/billing.repository")
vi.mock("@/libs/integrations")
vi.mock("@/libs/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  logger: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock("@/libs/email-templates", () => ({
  renderEmailTemplate: vi.fn().mockReturnValue("<html>email</html>"),
}))
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_EMAIL_SUPPORT: "suporte@pulseips.com.br",
  },
}))

const mockCreateToken = vi.mocked(createAccountDeletionToken)
const mockFindToken = vi.mocked(findAccountDeletionToken)
const mockConsumeToken = vi.mocked(consumeAccountDeletionToken)
const mockScheduleDeletion = vi.mocked(scheduleOrganizationDeletion)
const mockCancelDeletion = vi.mocked(cancelOrganizationDeletionSchedule)
const mockFindAllScheduled = vi.mocked(findAllTenantsScheduledForDeletion)
const mockExecuteDeletion = vi.mocked(executeOrganizationDeletion)
const mockFindOrgById = vi.mocked(findOrganizationById)
const mockFindSubscription = vi.mocked(findSubscriptionByTenantId)
const mockGetEmailService = vi.mocked(getEmailService)
const mockGetBillingService = vi.mocked(getBillingService)

const TENANT_ID = "tenant-1"
const USER_ID = "user-1"
const USER_EMAIL = "admin@acme.com"
const ORG_NAME = "Acme Corp"
const VALID_CODE = "123456"
const VALID_TOKEN = {
  id: "token-1",
  token: VALID_CODE,
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
}
const ORG = {
  id: TENANT_ID,
  name: ORG_NAME,
  deletionScheduledAt: null,
}
const ACTIVE_SUBSCRIPTION = {
  id: "sub-1",
  status: "active",
  externalSubscriptionId: "sub_stripe_123",
}

const mockSendEmail = vi.fn().mockResolvedValue({ id: "email-1" })
const mockCancelSubscription = vi.fn().mockResolvedValue(undefined)

const MOCK_BILLING_SERVICE = {
  createProduct: vi.fn(),
  createPrice: vi.fn(),
  createCheckoutSession: vi.fn(),
  createBillingPortalSession: vi.fn(),
  createCustomer: vi.fn(),
  cancelSubscription: mockCancelSubscription,
  constructWebhookEvent: vi.fn(),
} as IBillingService

beforeEach(() => {
  vi.clearAllMocks()
  mockGetEmailService.mockReturnValue({ send: mockSendEmail } as ReturnType<typeof getEmailService>)
  mockGetBillingService.mockReturnValue(MOCK_BILLING_SERVICE)
  mockCreateToken.mockResolvedValue(undefined)
  mockConsumeToken.mockResolvedValue(undefined)
  mockScheduleDeletion.mockResolvedValue(undefined)
  mockCancelDeletion.mockResolvedValue(undefined)
  mockFindOrgById.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrganizationById>>)
  mockFindSubscription.mockResolvedValue(null)
})

describe("requestAccountDeletionCode", () => {
  it("cria token de exclusão e envia e-mail de confirmação", async () => {
    await requestAccountDeletionCode(TENANT_ID, USER_ID, USER_EMAIL, ORG_NAME)

    expect(mockCreateToken).toHaveBeenCalledWith(
      USER_ID,
      expect.stringMatching(/^\d{6}$/),
      expect.any(Date),
    )
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER_EMAIL }),
    )
  })

  it("gera um código numérico de 6 dígitos diferente a cada chamada", async () => {
    const codes = new Set<string>()
    for (let i = 0; i < 10; i++) {
      await requestAccountDeletionCode(TENANT_ID, USER_ID, USER_EMAIL, ORG_NAME)
      const call = mockCreateToken.mock.calls[i]
      if (call?.[1] !== undefined) codes.add(call[1])
    }
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe("confirmAccountDeletion — validação do token", () => {
  it("lança AppError quando token não existe", async () => {
    mockFindToken.mockResolvedValue(null)

    await expect(
      confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE),
    ).rejects.toMatchObject({ code: "INVALID_CODE" })

    expect(mockConsumeToken).not.toHaveBeenCalled()
    expect(mockScheduleDeletion).not.toHaveBeenCalled()
  })

  it("lança AppError quando código não confere", async () => {
    mockFindToken.mockResolvedValue(VALID_TOKEN as Awaited<ReturnType<typeof findAccountDeletionToken>>)

    await expect(
      confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, "999999"),
    ).rejects.toMatchObject({ code: "INVALID_CODE" })

    expect(mockScheduleDeletion).not.toHaveBeenCalled()
  })

  it("lança AppError quando token está expirado", async () => {
    mockFindToken.mockResolvedValue({
      ...VALID_TOKEN,
      expiresAt: new Date(Date.now() - 1_000),
    } as Awaited<ReturnType<typeof findAccountDeletionToken>>)

    await expect(
      confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE),
    ).rejects.toMatchObject({ code: "INVALID_CODE" })

    expect(mockScheduleDeletion).not.toHaveBeenCalled()
  })
})

describe("confirmAccountDeletion — fluxo de sucesso", () => {
  beforeEach(() => {
    mockFindToken.mockResolvedValue(VALID_TOKEN as Awaited<ReturnType<typeof findAccountDeletionToken>>)
  })

  it("retorna deletionScheduledAt sem destruir a sessão", async () => {
    const result = await confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE)

    expect(result.deletionScheduledAt).toBeInstanceOf(Date)
    expect(result.deletionScheduledAt.getTime()).toBeGreaterThan(Date.now())
  })

  it("consome o token após validação bem-sucedida", async () => {
    await confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE)

    expect(mockConsumeToken).toHaveBeenCalledWith(VALID_TOKEN.id)
  })

  it("agenda exclusão para 30 dias no futuro", async () => {
    await confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE)

    expect(mockScheduleDeletion).toHaveBeenCalledWith(
      TENANT_ID,
      expect.any(Date),
    )
    const scheduledDate = mockScheduleDeletion.mock.calls[0]?.[1]
    const diffDays = scheduledDate !== undefined
      ? Math.round((scheduledDate.getTime() - Date.now()) / 86_400_000)
      : 0
    expect(diffDays).toBe(30)
  })

  it("envia e-mail de exclusão agendada com a data formatada", async () => {
    await confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE)

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER_EMAIL }),
    )
  })

  it("cancela assinatura ativa no billing antes de agendar exclusão", async () => {
    mockFindSubscription.mockResolvedValue(
      ACTIVE_SUBSCRIPTION as Awaited<ReturnType<typeof findSubscriptionByTenantId>>,
    )

    await confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE)

    expect(mockCancelSubscription).toHaveBeenCalledWith(ACTIVE_SUBSCRIPTION.externalSubscriptionId)
    expect(mockScheduleDeletion).toHaveBeenCalled()
  })

  it("não cancela billing quando não há assinatura ativa", async () => {
    mockFindSubscription.mockResolvedValue(null)

    await confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE)

    expect(mockCancelSubscription).not.toHaveBeenCalled()
    expect(mockScheduleDeletion).toHaveBeenCalled()
  })

  it("não cancela billing quando assinatura está cancelada", async () => {
    mockFindSubscription.mockResolvedValue({
      ...ACTIVE_SUBSCRIPTION,
      status: "cancelled",
    } as Awaited<ReturnType<typeof findSubscriptionByTenantId>>)

    await confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE)

    expect(mockCancelSubscription).not.toHaveBeenCalled()
    expect(mockScheduleDeletion).toHaveBeenCalled()
  })

  it("continua com agendamento mesmo se cancelamento no billing falhar", async () => {
    mockFindSubscription.mockResolvedValue(
      ACTIVE_SUBSCRIPTION as Awaited<ReturnType<typeof findSubscriptionByTenantId>>,
    )
    mockCancelSubscription.mockRejectedValue(new Error("Stripe timeout"))

    const result = await confirmAccountDeletion(TENANT_ID, USER_ID, USER_EMAIL, VALID_CODE)

    expect(result.deletionScheduledAt).toBeInstanceOf(Date)
    expect(mockScheduleDeletion).toHaveBeenCalled()
  })
})

describe("cancelScheduledOrganizationDeletion", () => {
  it("lança AppError quando organização não existe", async () => {
    mockFindOrgById.mockResolvedValue(null)

    await expect(
      cancelScheduledOrganizationDeletion(TENANT_ID),
    ).rejects.toMatchObject({ code: "ORG_NOT_FOUND" })

    expect(mockCancelDeletion).not.toHaveBeenCalled()
  })

  it("lança AppError quando exclusão não está agendada", async () => {
    mockFindOrgById.mockResolvedValue({ ...ORG, deletionScheduledAt: null } as Awaited<ReturnType<typeof findOrganizationById>>)

    await expect(
      cancelScheduledOrganizationDeletion(TENANT_ID),
    ).rejects.toMatchObject({ code: "NOT_SCHEDULED" })

    expect(mockCancelDeletion).not.toHaveBeenCalled()
  })

  it("cancela exclusão agendada com sucesso", async () => {
    mockFindOrgById.mockResolvedValue({
      ...ORG,
      deletionScheduledAt: new Date(Date.now() + 86_400_000),
    } as Awaited<ReturnType<typeof findOrganizationById>>)

    await cancelScheduledOrganizationDeletion(TENANT_ID)

    expect(mockCancelDeletion).toHaveBeenCalledWith(TENANT_ID)
  })
})

describe("runOrganizationDeletionExecutor", () => {
  it("não executa nenhuma exclusão quando não há orgs agendadas", async () => {
    mockFindAllScheduled.mockResolvedValue([])

    const result = await runOrganizationDeletionExecutor()

    expect(result).toEqual({ deleted: 0 })
    expect(mockExecuteDeletion).not.toHaveBeenCalled()
  })

  it("executa exclusão para cada org com deletionScheduledAt vencido", async () => {
    const orgs = [
      { id: "org-a" },
      { id: "org-b" },
      { id: "org-c" },
    ]
    mockFindAllScheduled.mockResolvedValue(orgs as Awaited<ReturnType<typeof findAllTenantsScheduledForDeletion>>)
    mockExecuteDeletion.mockResolvedValue({} as Awaited<ReturnType<typeof executeOrganizationDeletion>>)

    const result = await runOrganizationDeletionExecutor()

    expect(result).toEqual({ deleted: 3 })
    expect(mockExecuteDeletion).toHaveBeenCalledTimes(3)
    expect(mockExecuteDeletion).toHaveBeenCalledWith("org-a")
    expect(mockExecuteDeletion).toHaveBeenCalledWith("org-b")
    expect(mockExecuteDeletion).toHaveBeenCalledWith("org-c")
  })
})
