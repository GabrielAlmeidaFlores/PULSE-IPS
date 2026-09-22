import { describe, it, expect } from "vitest"
import { normalizeEmail } from "@/libs/utils/email"

const CASES: [string, string][] = [
  ["Financeiro3@innovatox.com.br", "financeiro3@innovatox.com.br"],
  ["  usuario@empresa.com  ", "usuario@empresa.com"],
  ["ADMIN@DEMO.COM", "admin@demo.com"],
  ["ja.minusculo@demo.com", "ja.minusculo@demo.com"],
]

describe("normalizeEmail", () => {
  it.each(CASES)("normaliza %s para %s", (input, expected) => {
    expect(normalizeEmail(input)).toBe(expected)
  })

  it("remove espaços nas bordas e rebaixa a caixa", () => {
    expect(normalizeEmail("  Financeiro3@Innovatox.COM  ")).toBe("financeiro3@innovatox.com")
  })
})
