import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  sendInvite,
  acceptInvite,
  resendOrgInvite,
  cancelOrgInvite,
} from "@/modules/auth/invite.service"
import {
  findOrgUserByEmailInTenant,
  createOrgInvitation,
  findOrgByIdOrThrow,
  findOrgInviteByToken,
  acceptInviteTransaction,
  findOrgInvitationById,
  updateOrgInvitationToken,
  cancelOrgInvitationById,
} from "@/modules/auth/auth.repository"
import { createAuditLog } from "@/modules/audit/audit.repository"
import { getEmailService } from "@/libs/integrations"

vi.mock("@/modules/auth/auth.repository")
vi.mock("@/modules/audit/audit.repository")
vi.mock("@/libs/integrations")
vi.mock("@/libs/email-templates", () => ({ renderEmailTemplate: vi.fn(() => "<html>invite</html>") }))
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    MESSAGING_PROVIDER: "console",
    EMAIL_PROVIDER: "console",
    BILLING_PROVIDER: "fake",
  },
}))

const mockFindOrgUserByEmailInTenant = vi.mocked(findOrgUserByEmailInTenant)
const mockCreateOrgInvitation = vi.mocked(createOrgInvitation)
const mockFindOrgByIdOrThrow = vi.mocked(findOrgByIdOrThrow)
const mockFindOrgInviteByToken = vi.mocked(findOrgInviteByToken)
const mockAcceptInviteTransaction = vi.mocked(acceptInviteTransaction)
const mockFindOrgInvitationById = vi.mocked(findOrgInvitationById)
const mockUpdateOrgInvitationToken = vi.mocked(updateOrgInvitationToken)
const mockCancelOrgInvitationById = vi.mocked(cancelOrgInvitationById)
const mockCreateAuditLog = vi.mocked(createAuditLog)
const mockGetEmailService = vi.mocked(getEmailService)

const TENANT_ID = "tenant-1"
const ACTOR_ID = "user-actor"
const MOCK_EMAIL_SEND = vi.fn().mockResolvedValue(undefined)

const ORG = { id: TENANT_ID, name: "Acme Corp" }
const INVITE = {
  id: "invite-1",
  tenantId: TENANT_ID,
  email: "novo@acme.com",
  role: "rh",
  token: "token-abc",
  usedAt: null,
  expiresAt: new Date(Date.now() + 86400000),
  createdAt: new Date(),
  organization: { name: "Acme Corp" },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindOrgUserByEmailInTenant.mockResolvedValue(null)
  mockCreateOrgInvitation.mockResolvedValue(undefined)
  mockFindOrgByIdOrThrow.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrgByIdOrThrow>>)
  mockFindOrgInviteByToken.mockResolvedValue(INVITE as Awaited<ReturnType<typeof findOrgInviteByToken>>)
  mockAcceptInviteTransaction.mockResolvedValue(undefined)
  mockFindOrgInvitationById.mockResolvedValue(INVITE)
  mockUpdateOrgInvitationToken.mockResolvedValue(undefined)
  mockCancelOrgInvitationById.mockResolvedValue(undefined)
  mockCreateAuditLog.mockResolvedValue(undefined)
  mockGetEmailService.mockReturnValue({ send: MOCK_EMAIL_SEND } as ReturnType<typeof getEmailService>)
})

describe("sendInvite", () => {
  it("envia convite e cria audit log quando e-mail não está cadastrado", async () => {
    await sendInvite(TENANT_ID, "novo@acme.com", "rh", ACTOR_ID)

    expect(mockCreateOrgInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, email: "novo@acme.com", role: "rh" }),
    )
    expect(MOCK_EMAIL_SEND).toHaveBeenCalledOnce()
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.invited" }),
    )
  })

  it("lança AppError quando usuário já está cadastrado", async () => {
    mockFindOrgUserByEmailInTenant.mockResolvedValue({ id: "user-1" } as Awaited<ReturnType<typeof findOrgUserByEmailInTenant>>)

    await expect(sendInvite(TENANT_ID, "existente@acme.com", "rh")).rejects.toMatchObject({
      code: "USER_ALREADY_EXISTS",
    })
    expect(MOCK_EMAIL_SEND).not.toHaveBeenCalled()
  })
})

describe("acceptInvite", () => {
  it("aceita convite válido e cria usuário", async () => {
    await acceptInvite("token-abc", "senha123", "João Silva")

    expect(mockAcceptInviteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ email: INVITE.email, tenantId: TENANT_ID }),
    )
    expect(MOCK_EMAIL_SEND).toHaveBeenCalledOnce()
  })

  it("lança AppError quando token não existe", async () => {
    mockFindOrgInviteByToken.mockResolvedValue(null)

    await expect(acceptInvite("token-invalido", "senha", "Nome")).rejects.toMatchObject({
      code: "INVITE_NOT_FOUND",
    })
  })

  it("lança AppError quando convite já foi utilizado", async () => {
    mockFindOrgInviteByToken.mockResolvedValue({
      ...INVITE,
      usedAt: new Date(),
    } as Awaited<ReturnType<typeof findOrgInviteByToken>>)

    await expect(acceptInvite("token-abc", "senha", "Nome")).rejects.toMatchObject({
      code: "INVITE_USED",
    })
  })

  it("lança AppError quando convite está expirado", async () => {
    mockFindOrgInviteByToken.mockResolvedValue({
      ...INVITE,
      expiresAt: new Date(Date.now() - 1000),
    } as Awaited<ReturnType<typeof findOrgInviteByToken>>)

    await expect(acceptInvite("token-abc", "senha", "Nome")).rejects.toMatchObject({
      code: "INVITE_EXPIRED",
    })
  })
})

describe("resendOrgInvite", () => {
  it("gera novo token e reenvio o e-mail de convite", async () => {
    await resendOrgInvite(TENANT_ID, "invite-1", ACTOR_ID)

    expect(mockUpdateOrgInvitationToken).toHaveBeenCalledWith(
      "invite-1",
      TENANT_ID,
      expect.any(String),
      expect.any(Date),
    )
    expect(MOCK_EMAIL_SEND).toHaveBeenCalledOnce()
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.invite_resent" }),
    )
  })

  it("lança AppError quando convite não existe", async () => {
    mockFindOrgInvitationById.mockResolvedValue(null)

    await expect(resendOrgInvite(TENANT_ID, "nao-existe")).rejects.toMatchObject({
      code: "INVITE_NOT_FOUND",
    })
  })

  it("lança AppError quando usuário já foi cadastrado", async () => {
    mockFindOrgUserByEmailInTenant.mockResolvedValue({ id: "user-1" } as Awaited<ReturnType<typeof findOrgUserByEmailInTenant>>)

    await expect(resendOrgInvite(TENANT_ID, "invite-1")).rejects.toMatchObject({
      code: "USER_ALREADY_EXISTS",
    })
  })
})

describe("cancelOrgInvite", () => {
  it("cancela convite e cria audit log", async () => {
    await cancelOrgInvite(TENANT_ID, "invite-1", ACTOR_ID)

    expect(mockCancelOrgInvitationById).toHaveBeenCalledWith("invite-1", TENANT_ID)
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.invite_cancelled" }),
    )
  })

  it("lança AppError quando convite não existe", async () => {
    mockFindOrgInvitationById.mockResolvedValue(null)

    await expect(cancelOrgInvite(TENANT_ID, "nao-existe")).rejects.toMatchObject({
      code: "INVITE_NOT_FOUND",
    })
  })
})
