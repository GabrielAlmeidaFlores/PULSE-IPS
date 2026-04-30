import { describe, it, expect } from "vitest"
import { normalizePhoneToE164 } from "@/libs/utils/phone"

const E164_BR_MOBILE = "+5511999999999"

const VALID_CASES: [string, string][] = [
  [E164_BR_MOBILE, E164_BR_MOBILE],
  ["+55 11 99999-9999", E164_BR_MOBILE],
  ["11999999999", E164_BR_MOBILE],
  ["1199999999", "+551199999999"],
  ["5511999999999", E164_BR_MOBILE],
  ["55 11 99999-9999", E164_BR_MOBILE],
  ["(11) 99999-9999", E164_BR_MOBILE],
  ["(11) 9999-9999", "+551199999999"],
  ["+14155552671", "+14155552671"],
]

const INVALID_CASES = ["", "123", "abcdefgh", "99999", "+55 (15) 9977", "+55 (11) 9999", "+55119977"]

describe("normalizePhoneToE164", () => {
  it.each(VALID_CASES)("normaliza %s para %s", (input, expected) => {
    expect(normalizePhoneToE164(input)).toBe(expected)
  })

  it.each(INVALID_CASES)("retorna null para entrada inválida: %s", (input) => {
    expect(normalizePhoneToE164(input)).toBeNull()
  })
})
