import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { generateSlug, isValidSlug, normalizeOrgSlug } from "@/libs/utils/slug"
import { buildPaginationParams, buildSkipTake, buildPaginatedResult } from "@/libs/utils/pagination"
import { verifyCronSecret } from "@/libs/utils/cron-auth"
import { isTokenExpired, isFutureDate, isWithinWorkHours, formatDatePtBR, formatDateTimePtBR, formatRelative } from "@/libs/utils/date"

vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "postgresql://test:test@localhost/test",
    NEXTAUTH_SECRET: "test",
    CRON_SECRET: "test-cron",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    MESSAGING_PROVIDER: "console",
    EMAIL_PROVIDER: "console",
    BILLING_PROVIDER: "fake",
  },
}))

describe("generateSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(generateSlug("Acme Corp")).toBe("acme-corp")
  })

  it("removes accents", () => {
    expect(generateSlug("Ação Rápida")).toBe("acao-rapida")
  })

  it("removes special characters", () => {
    expect(generateSlug("Hello & World!")).toBe("hello-world")
  })

  it("collapses multiple spaces and hyphens", () => {
    expect(generateSlug("foo   bar--baz")).toBe("foo-bar-baz")
  })

  it("trims leading and trailing whitespace", () => {
    expect(generateSlug("  trimmed  ")).toBe("trimmed")
  })

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("")
  })

  it("preserves numbers", () => {
    expect(generateSlug("Company 42")).toBe("company-42")
  })
})

describe("isValidSlug", () => {
  it("accepts lowercase alphanumeric slug", () => {
    expect(isValidSlug("acme-corp")).toBe(true)
  })

  it("accepts slug with numbers", () => {
    expect(isValidSlug("org123")).toBe(true)
  })

  it("rejects slug with uppercase", () => {
    expect(isValidSlug("Acme")).toBe(false)
  })

  it("rejects slug with leading hyphen", () => {
    expect(isValidSlug("-acme")).toBe(false)
  })

  it("rejects slug with trailing hyphen", () => {
    expect(isValidSlug("acme-")).toBe(false)
  })

  it("rejects slug with double hyphen", () => {
    expect(isValidSlug("acme--corp")).toBe(false)
  })

  it("rejects empty string", () => {
    expect(isValidSlug("")).toBe(false)
  })

  it("rejects slug with spaces", () => {
    expect(isValidSlug("acme corp")).toBe(false)
  })

  it("rejects slug with special characters", () => {
    expect(isValidSlug("acme!corp")).toBe(false)
  })
})

describe("normalizeOrgSlug", () => {
  it("rebaixa a caixa e remove espaços nas bordas", () => {
    expect(normalizeOrgSlug("  Innovatox  ")).toBe("innovatox")
  })

  it("mantém slug já normalizado", () => {
    expect(normalizeOrgSlug("acme-corp")).toBe("acme-corp")
  })
})

describe("buildPaginationParams", () => {
  it("returns defaults when inputs are undefined", () => {
    const result = buildPaginationParams(undefined, undefined)
    expect(result).toEqual({ page: 1, pageSize: 10 })
  })

  it("parses valid page and pageSize", () => {
    const result = buildPaginationParams("3", "20")
    expect(result).toEqual({ page: 3, pageSize: 20 })
  })

  it("clamps page to minimum 1", () => {
    expect(buildPaginationParams("0", "10").page).toBe(1)
    expect(buildPaginationParams("-5", "10").page).toBe(1)
  })

  it("clamps pageSize to maximum 100", () => {
    expect(buildPaginationParams("1", "500").pageSize).toBe(100)
  })

  it("uses default pageSize of 10 when 0 is provided (falsy input)", () => {
    expect(buildPaginationParams("1", "0").pageSize).toBe(10)
  })

  it("handles non-numeric input by using defaults", () => {
    const result = buildPaginationParams("abc", "xyz")
    expect(result).toEqual({ page: 1, pageSize: 10 })
  })
})

describe("buildSkipTake", () => {
  it("page 1 produces skip 0", () => {
    expect(buildSkipTake({ page: 1, pageSize: 10 })).toEqual({ skip: 0, take: 10 })
  })

  it("page 2 with pageSize 10 produces skip 10", () => {
    expect(buildSkipTake({ page: 2, pageSize: 10 })).toEqual({ skip: 10, take: 10 })
  })

  it("page 3 with pageSize 25 produces skip 50", () => {
    expect(buildSkipTake({ page: 3, pageSize: 25 })).toEqual({ skip: 50, take: 25 })
  })
})

describe("buildPaginatedResult", () => {
  it("computes totalPages and pagination flags", () => {
    const result = buildPaginatedResult(["a", "b"], 10, { page: 1, pageSize: 2 })
    expect(result.totalPages).toBe(5)
    expect(result.hasNextPage).toBe(true)
    expect(result.hasPreviousPage).toBe(false)
    expect(result.total).toBe(10)
  })

  it("last page has no next page", () => {
    const result = buildPaginatedResult(["a"], 5, { page: 5, pageSize: 1 })
    expect(result.hasNextPage).toBe(false)
    expect(result.hasPreviousPage).toBe(true)
  })

  it("middle page has both flags true", () => {
    const result = buildPaginatedResult(["a"], 10, { page: 3, pageSize: 2 })
    expect(result.hasNextPage).toBe(true)
    expect(result.hasPreviousPage).toBe(true)
  })

  it("single page with all items has no navigation", () => {
    const result = buildPaginatedResult([1, 2, 3], 3, { page: 1, pageSize: 10 })
    expect(result.hasNextPage).toBe(false)
    expect(result.hasPreviousPage).toBe(false)
    expect(result.totalPages).toBe(1)
  })
})

describe("verifyCronSecret", () => {
  it("returns true for matching secret", () => {
    expect(verifyCronSecret("my-secret", "my-secret")).toBe(true)
  })

  it("returns false when received is null", () => {
    expect(verifyCronSecret(null, "my-secret")).toBe(false)
  })

  it("returns false for mismatched secret", () => {
    expect(verifyCronSecret("wrong", "my-secret")).toBe(false)
  })

  it("returns false for different length secrets", () => {
    expect(verifyCronSecret("short", "longer-secret")).toBe(false)
  })

  it("returns false for empty received", () => {
    expect(verifyCronSecret("", "secret")).toBe(false)
  })
})

describe("isTokenExpired", () => {
  it("returns true for past date", () => {
    const past = new Date(Date.now() - 1000)
    expect(isTokenExpired(past)).toBe(true)
  })

  it("returns false for future date", () => {
    const future = new Date(Date.now() + 100_000)
    expect(isTokenExpired(future)).toBe(false)
  })
})

describe("isFutureDate", () => {
  it("returns true for future date", () => {
    const future = new Date(Date.now() + 100_000)
    expect(isFutureDate(future)).toBe(true)
  })

  it("returns false for past date", () => {
    const past = new Date(Date.now() - 1000)
    expect(isFutureDate(past)).toBe(false)
  })
})

describe("isWithinWorkHours", () => {
  const TIMEZONE = "America/Sao_Paulo"

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns true when current time is within work window", () => {
    vi.setSystemTime(new Date("2024-01-15T12:00:00-03:00"))
    expect(isWithinWorkHours(TIMEZONE, "09:00", "18:00")).toBe(true)
  })

  it("returns false when before work start", () => {
    vi.setSystemTime(new Date("2024-01-15T07:00:00-03:00"))
    expect(isWithinWorkHours(TIMEZONE, "09:00", "18:00")).toBe(false)
  })

  it("returns false when after work end", () => {
    vi.setSystemTime(new Date("2024-01-15T20:00:00-03:00"))
    expect(isWithinWorkHours(TIMEZONE, "09:00", "18:00")).toBe(false)
  })

  it("handles night shift crossing midnight — inside window", () => {
    vi.setSystemTime(new Date("2024-01-15T23:00:00-03:00"))
    expect(isWithinWorkHours(TIMEZONE, "22:00", "06:00")).toBe(true)
  })

  it("handles night shift crossing midnight — also inside after midnight", () => {
    vi.setSystemTime(new Date("2024-01-15T02:00:00-03:00"))
    expect(isWithinWorkHours(TIMEZONE, "22:00", "06:00")).toBe(true)
  })

  it("handles night shift crossing midnight — outside window", () => {
    vi.setSystemTime(new Date("2024-01-15T10:00:00-03:00"))
    expect(isWithinWorkHours(TIMEZONE, "22:00", "06:00")).toBe(false)
  })
})


describe("formatDatePtBR", () => {
  it("formats Date object to dd/MM/yyyy", () => {
    expect(formatDatePtBR(new Date("2024-03-15T12:00:00Z"))).toMatch(/15\/03\/2024/)
  })

  it("formats ISO string to dd/MM/yyyy", () => {
    expect(formatDatePtBR("2024-07-04")).toMatch(/04\/07\/2024/)
  })
})

describe("formatDateTimePtBR", () => {
  it("formats Date object to dd/MM/yyyy às HH:mm", () => {
    const result = formatDateTimePtBR(new Date("2024-03-15T12:00:00Z"))
    expect(result).toMatch(/15\/03\/2024/)
    expect(result).toContain("às")
  })

  it("formats ISO string", () => {
    const result = formatDateTimePtBR("2024-07-04T10:30:00")
    expect(result).toContain("04/07/2024")
  })
})

describe("formatRelative", () => {
  it("returns a relative time string", () => {
    const recent = new Date(Date.now() - 60 * 1000)
    const result = formatRelative(recent)
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("handles ISO string input", () => {
    const result = formatRelative(new Date(Date.now() - 3600 * 1000).toISOString())
    expect(typeof result).toBe("string")
  })
})
