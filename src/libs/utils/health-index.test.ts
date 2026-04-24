import { describe, it, expect } from "vitest"
import {
  toHealthIndex,
  healthIndexLabel,
  healthIndexAccent,
  healthIndexBarColor,
  healthIndexChartColor,
} from "@/libs/utils/health-index"

describe("toHealthIndex", () => {
  it("maps score 1 (minimum) to 0%", () => {
    expect(toHealthIndex(1)).toBe(0)
  })

  it("maps score 5 (maximum) to 100%", () => {
    expect(toHealthIndex(5)).toBe(100)
  })

  it("maps score 3 (midpoint) to 50%", () => {
    expect(toHealthIndex(3)).toBe(50)
  })

  it("maps score 2 to 25%", () => {
    expect(toHealthIndex(2)).toBe(25)
  })

  it("maps score 4 to 75%", () => {
    expect(toHealthIndex(4)).toBe(75)
  })

  it("rounds fractional results", () => {
    expect(toHealthIndex(2.5)).toBe(38)
  })
})

describe("healthIndexLabel", () => {
  it("returns '—' for null", () => {
    expect(healthIndexLabel(null)).toBe("—")
  })

  it("returns Saudável for hi >= 62", () => {
    expect(healthIndexLabel(62)).toBe("Saudável")
    expect(healthIndexLabel(100)).toBe("Saudável")
  })

  it("returns Atenção for 37 <= hi < 62", () => {
    expect(healthIndexLabel(37)).toBe("Atenção")
    expect(healthIndexLabel(61)).toBe("Atenção")
  })

  it("returns Crítico for hi < 37", () => {
    expect(healthIndexLabel(0)).toBe("Crítico")
    expect(healthIndexLabel(36)).toBe("Crítico")
  })
})

describe("healthIndexAccent", () => {
  it("returns muted for null", () => {
    expect(healthIndexAccent(null)).toBe("text-muted-foreground")
  })

  it("returns green for healthy range", () => {
    expect(healthIndexAccent(75)).toBe("text-green-600")
  })

  it("returns yellow for warning range", () => {
    expect(healthIndexAccent(50)).toBe("text-yellow-600")
  })

  it("returns red for critical range", () => {
    expect(healthIndexAccent(20)).toBe("text-red-600")
  })
})

describe("healthIndexBarColor", () => {
  it("returns green for healthy", () => {
    expect(healthIndexBarColor(80)).toBe("bg-green-500")
  })

  it("returns yellow for warning", () => {
    expect(healthIndexBarColor(50)).toBe("bg-yellow-500")
  })

  it("returns red for critical", () => {
    expect(healthIndexBarColor(10)).toBe("bg-red-500")
  })
})

describe("healthIndexChartColor", () => {
  it("returns green hex for healthy", () => {
    expect(healthIndexChartColor(70)).toBe("#16a34a")
  })

  it("returns amber hex for warning", () => {
    expect(healthIndexChartColor(50)).toBe("#d97706")
  })

  it("returns red hex for critical", () => {
    expect(healthIndexChartColor(20)).toBe("#dc2626")
  })
})
