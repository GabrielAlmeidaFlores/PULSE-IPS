import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  login,
  superAdminLogin,
  changePassword,
  requestPasswordReset,
  resetPassword,
  hashPassword,
  verifyPassword,
  logout,
  superAdminLogout,
  getOrgUserById,
  listSuperAdmins,
} from "@/modules/auth/auth.service"
import {
  findOrgBySlug,
  findOrgUserByEmail,
  findOrgUserById,
  findOrgUserByIdOnly,
  findSuperAdminByEmail,
  updateOrgUserPassword,
  invalidatePreviousResetTokens,
  createPasswordResetToken,
  findAuthToken,
  consumeAuthToken,
  findAllSuperAdmins,
} from "@/modules/auth/auth.repository"
import { createSession, createSuperAdminSession, destroySession, destroySuperAdminSession } from "@/modules/auth/session"
import { createAuditLog } from "@/modules/audit/audit.repository"
import { getEmailService } from "@/libs/integrations"
import bcrypt from "bcryptjs"

vi.mock("@/modules/auth/auth.repository")
vi.mock("@/modules/auth/session")
vi.mock("@/modules/audit/audit.repository")
vi.mock("@/libs/integrations")
vi.mock("@/libs/email-templates", () => ({ renderEmailTemplate: vi.fn(() => "<html>reset</html>") }))
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn((_plain: string, _rounds: number) => Promise.resolve(HASHED_PASSWORD)),
    compare: vi.fn((_plain: string, _hash: string) => Promise.resolve(true)),
  },
}))
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    MESSAGING_PROVIDER: "console",
    EMAIL_PROVIDER: "console",
    BILLING_PROVIDER: "fake",
  },
}))

const HASHED_PASSWORD = "hashed-password"

const mockFindOrgBySlug = vi.mocked(findOrgBySlug)
const mockFindOrgUserByEmail = vi.mocked(findOrgUserByEmail)
const mockFindOrgUserById = vi.mocked(findOrgUserById)
const mockFindOrgUserByIdOnly = vi.mocked(findOrgUserByIdOnly)
const mockFindSuperAdminByEmail = vi.mocked(findSuperAdminByEmail)
const mockUpdateOrgUserPassword = vi.mocked(updateOrgUserPassword)
const mockInvalidatePreviousResetTokens = vi.mocked(invalidatePreviousResetTokens)
const mockCreatePasswordResetToken = vi.mocked(createPasswordResetToken)
const mockFindAuthToken = vi.mocked(findAuthToken)
const mockConsumeAuthToken = vi.mocked(consumeAuthToken)
const mockCreateSession = vi.mocked(createSession)
const mockCreateSuperAdminSession = vi.mocked(createSuperAdminSession)
const mockDestroySession = vi.mocked(destroySession)
const mockDestroySuperAdminSession = vi.mocked(destroySuperAdminSession)
const mockFindAllSuperAdmins = vi.mocked(findAllSuperAdmins)
const mockCreateAuditLog = vi.mocked(createAuditLog)
const mockBcryptHash = vi.mocked(bcrypt.hash)
const mockBcryptCompare = vi.mocked(bcrypt.compare)

const ORG = { id: "org-1", slug: "acme", isActive: true, billingStatus: "active" }
const USER = {
  id: "user-1",
  tenantId: "org-1",
  email: "joao@acme.com",
  passwordHash: HASHED_PASSWORD,
  role: "admin" as const,
  isActive: true,
  name: "João",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateSession.mockResolvedValue(undefined)
  mockCreateSuperAdminSession.mockResolvedValue(undefined)
  mockCreateAuditLog.mockResolvedValue(undefined)
  mockBcryptHash.mockResolvedValue(HASHED_PASSWORD as string)
  mockBcryptCompare.mockResolvedValue(true as boolean)
  mockInvalidatePreviousResetTokens.mockResolvedValue(undefined)
  mockCreatePasswordResetToken.mockResolvedValue(undefined)
  mockUpdateOrgUserPassword.mockResolvedValue(undefined)
})

describe("hashPassword", () => {
  it("calls bcrypt.hash with 12 rounds", async () => {
    await hashPassword("my-plain-password")
    expect(mockBcryptHash).toHaveBeenCalledWith("my-plain-password", 12)
  })

  it("returns the hashed value", async () => {
    mockBcryptHash.mockResolvedValue("$bcrypt$hash" as string)
    const result = await hashPassword("password")
    expect(result).toBe("$bcrypt$hash")
  })
})

describe("verifyPassword", () => {
  it("returns true when password matches hash", async () => {
    mockBcryptCompare.mockResolvedValue(true as boolean)
    const result = await verifyPassword("plain", "hash")
    expect(result).toBe(true)
  })

  it("returns false when password does not match", async () => {
    mockBcryptCompare.mockResolvedValue(false as boolean)
    const result = await verifyPassword("wrong", "hash")
    expect(result).toBe(false)
  })
})

describe("login", () => {
  it("throws when org not found", async () => {
    mockFindOrgBySlug.mockResolvedValue(null)
    await expect(login({ orgSlug: "unknown", email: "x@x.com", password: "pass" })).rejects.toMatchObject({
      code: "ORG_NOT_FOUND",
    })
  })

  it("throws when user not found", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrgBySlug>>)
    mockFindOrgUserByEmail.mockResolvedValue(null)
    await expect(login({ orgSlug: "acme", email: "x@x.com", password: "pass" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    })
  })

  it("throws when user is inactive", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrgBySlug>>)
    mockFindOrgUserByEmail.mockResolvedValue({ ...USER, isActive: false } as Awaited<ReturnType<typeof findOrgUserByEmail>>)
    await expect(login({ orgSlug: "acme", email: USER.email, password: "pass" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    })
  })

  it("throws when password is wrong", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrgBySlug>>)
    mockFindOrgUserByEmail.mockResolvedValue(USER as Awaited<ReturnType<typeof findOrgUserByEmail>>)
    mockBcryptCompare.mockResolvedValue(false as boolean)
    await expect(login({ orgSlug: "acme", email: USER.email, password: "wrong" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    })
  })

  it("returns session payload on successful login", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrgBySlug>>)
    mockFindOrgUserByEmail.mockResolvedValue(USER as Awaited<ReturnType<typeof findOrgUserByEmail>>)
    mockBcryptCompare.mockResolvedValue(true as boolean)

    const result = await login({ orgSlug: "acme", email: USER.email, password: "correct" })

    expect(result).toMatchObject({ userId: USER.id, tenantId: ORG.id, role: "admin" })
    expect(mockCreateSession).toHaveBeenCalledOnce()
    expect(mockCreateAuditLog).toHaveBeenCalledOnce()
  })

  it("throws when user has invalid role", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrgBySlug>>)
    mockFindOrgUserByEmail.mockResolvedValue({ ...USER, role: "super_admin" } as Awaited<ReturnType<typeof findOrgUserByEmail>>)
    await expect(login({ orgSlug: "acme", email: USER.email, password: "pass" })).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    })
  })
})

describe("superAdminLogin", () => {
  const ADMIN = { id: "sa-1", email: "admin@pulse.com", passwordHash: "hashed", isActive: true, name: "Admin" }

  it("throws when admin not found", async () => {
    mockFindSuperAdminByEmail.mockResolvedValue(null)
    await expect(superAdminLogin({ email: "x@x.com", password: "p" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    })
  })

  it("throws when password is wrong", async () => {
    mockFindSuperAdminByEmail.mockResolvedValue(ADMIN as Awaited<ReturnType<typeof findSuperAdminByEmail>>)
    mockBcryptCompare.mockResolvedValue(false as boolean)
    await expect(superAdminLogin({ email: ADMIN.email, password: "wrong" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    })
  })

  it("creates super admin session on success", async () => {
    mockFindSuperAdminByEmail.mockResolvedValue(ADMIN as Awaited<ReturnType<typeof findSuperAdminByEmail>>)
    mockBcryptCompare.mockResolvedValue(true as boolean)
    await superAdminLogin({ email: ADMIN.email, password: "correct" })
    expect(mockCreateSuperAdminSession).toHaveBeenCalledWith({
      adminId: ADMIN.id,
      email: ADMIN.email,
      type: "super_admin",
    })
  })
})

describe("changePassword", () => {
  it("throws when user not found", async () => {
    mockFindOrgUserById.mockResolvedValue(null)
    await expect(changePassword("user-x", "org-1", "current", "new")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    })
  })

  it("throws when current password is wrong", async () => {
    mockFindOrgUserById.mockResolvedValue(USER as Awaited<ReturnType<typeof findOrgUserById>>)
    mockBcryptCompare.mockResolvedValue(false as boolean)
    await expect(changePassword(USER.id, "org-1", "wrong", "new")).rejects.toMatchObject({
      code: "INVALID_PASSWORD",
    })
  })

  it("updates password on success", async () => {
    mockFindOrgUserById.mockResolvedValue(USER as Awaited<ReturnType<typeof findOrgUserById>>)
    mockBcryptCompare.mockResolvedValue(true as boolean)
    await changePassword(USER.id, "org-1", "current", "new")
    expect(mockUpdateOrgUserPassword).toHaveBeenCalledWith(USER.id, "org-1", HASHED_PASSWORD)
    expect(mockCreateAuditLog).toHaveBeenCalledOnce()
  })
})

describe("requestPasswordReset", () => {
  it("returns silently when org not found (security: no enumeration)", async () => {
    mockFindOrgBySlug.mockResolvedValue(null)
    await expect(requestPasswordReset("x@x.com", "unknown")).resolves.toBeUndefined()
    expect(mockCreatePasswordResetToken).not.toHaveBeenCalled()
  })

  it("returns silently when user not found", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrgBySlug>>)
    mockFindOrgUserByEmail.mockResolvedValue(null)
    await expect(requestPasswordReset("x@x.com", "acme")).resolves.toBeUndefined()
    expect(mockCreatePasswordResetToken).not.toHaveBeenCalled()
  })

  it("returns silently when user is inactive", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrgBySlug>>)
    mockFindOrgUserByEmail.mockResolvedValue({ ...USER, isActive: false } as Awaited<ReturnType<typeof findOrgUserByEmail>>)
    await expect(requestPasswordReset(USER.email, "acme")).resolves.toBeUndefined()
    expect(mockCreatePasswordResetToken).not.toHaveBeenCalled()
  })

  it("creates token and sends email for valid user", async () => {
    mockFindOrgBySlug.mockResolvedValue(ORG as Awaited<ReturnType<typeof findOrgBySlug>>)
    mockFindOrgUserByEmail.mockResolvedValue(USER as Awaited<ReturnType<typeof findOrgUserByEmail>>)
    const mockSend = vi.fn().mockResolvedValue({ id: "email-1" })
    vi.mocked(getEmailService).mockReturnValue({ send: mockSend } as ReturnType<typeof getEmailService>)

    await requestPasswordReset(USER.email, "acme")

    expect(mockInvalidatePreviousResetTokens).toHaveBeenCalledWith(USER.id)
    expect(mockCreatePasswordResetToken).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledOnce()
  })
})

describe("resetPassword", () => {
  const validToken = {
    id: "token-1",
    token: "abc123",
    userId: USER.id,
    type: "password_reset",
    usedAt: null,
    expiresAt: new Date(Date.now() + 3600_000),
  }

  it("throws when token does not exist", async () => {
    mockFindAuthToken.mockResolvedValue(null)
    await expect(resetPassword("bad-token", "newpass")).rejects.toMatchObject({ code: "INVALID_TOKEN" })
  })

  it("throws when token type is not password_reset", async () => {
    mockFindAuthToken.mockResolvedValue({ ...validToken, type: "email_verification" } as Awaited<ReturnType<typeof findAuthToken>>)
    await expect(resetPassword("token", "newpass")).rejects.toMatchObject({ code: "INVALID_TOKEN" })
  })

  it("throws when token already used", async () => {
    mockFindAuthToken.mockResolvedValue({ ...validToken, usedAt: new Date() } as Awaited<ReturnType<typeof findAuthToken>>)
    await expect(resetPassword("token", "newpass")).rejects.toMatchObject({ code: "INVALID_TOKEN" })
  })

  it("throws when token is expired", async () => {
    mockFindAuthToken.mockResolvedValue({ ...validToken, expiresAt: new Date(Date.now() - 1000) } as Awaited<ReturnType<typeof findAuthToken>>)
    await expect(resetPassword("token", "newpass")).rejects.toMatchObject({ code: "INVALID_TOKEN" })
  })

  it("throws when user not found", async () => {
    mockFindAuthToken.mockResolvedValue(validToken as Awaited<ReturnType<typeof findAuthToken>>)
    mockFindOrgUserByIdOnly.mockResolvedValue(null)
    await expect(resetPassword("token", "newpass")).rejects.toMatchObject({ code: "USER_NOT_FOUND" })
  })

  it("resets password and consumes token on success", async () => {
    mockFindAuthToken.mockResolvedValue(validToken as Awaited<ReturnType<typeof findAuthToken>>)
    mockFindOrgUserByIdOnly.mockResolvedValue(USER as Awaited<ReturnType<typeof findOrgUserByIdOnly>>)
    mockConsumeAuthToken.mockResolvedValue(undefined)

    await resetPassword("token", "newpass")

    expect(mockConsumeAuthToken).toHaveBeenCalledWith(validToken.id, USER.id, USER.tenantId, HASHED_PASSWORD)
    expect(mockCreateAuditLog).toHaveBeenCalledOnce()
  })
})

describe("logout", () => {
  it("calls destroySession", async () => {
    mockDestroySession.mockResolvedValue(undefined)

    await logout()
    expect(mockDestroySession).toHaveBeenCalledOnce()
  })
})

describe("superAdminLogout", () => {
  it("calls destroySuperAdminSession", async () => {
    mockDestroySuperAdminSession.mockResolvedValue(undefined)

    await superAdminLogout()
    expect(mockDestroySuperAdminSession).toHaveBeenCalledOnce()
  })
})

describe("getOrgUserById", () => {
  it("returns org user by id and tenant", async () => {
    const user = { id: "user-1", tenantId: "org-1", email: "u@test.com", name: "User" }
    mockFindOrgUserById.mockResolvedValue(user as Awaited<ReturnType<typeof findOrgUserById>>)

    const result = await getOrgUserById("user-1", "org-1")
    expect(result).toEqual(user)
    expect(mockFindOrgUserById).toHaveBeenCalledWith("user-1", "org-1")
  })
})

describe("listSuperAdmins", () => {
  it("returns all super admin users", async () => {
    const admins = [{ id: "admin-1", email: "sa@pulse.com", name: "Super Admin" }]
    mockFindAllSuperAdmins.mockResolvedValue(admins as Awaited<ReturnType<typeof findAllSuperAdmins>>)

    const result = await listSuperAdmins()
    expect(result).toEqual(admins)
    expect(mockFindAllSuperAdmins).toHaveBeenCalledOnce()
  })
})
