import { describe, it, expect, vi, beforeEach } from "vitest"
import { healthService } from "@/modules/health/health.service"
import { healthRepository } from "@/modules/health/health.repository"

vi.mock("@/modules/health/health.repository")

const mockPing = vi.mocked(healthRepository.ping)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("healthService.checkDatabase", () => {
  it("retorna true quando o banco responde corretamente", async () => {
    mockPing.mockResolvedValue(undefined)

    const result = await healthService.checkDatabase()

    expect(result).toBe(true)
    expect(mockPing).toHaveBeenCalledOnce()
  })

  it("retorna false quando o banco lança erro", async () => {
    mockPing.mockRejectedValue(new Error("Connection refused"))

    const result = await healthService.checkDatabase()

    expect(result).toBe(false)
  })
})
