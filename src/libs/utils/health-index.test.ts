import { describe, it, expect } from "vitest"
import {
  toHealthIndex,
  healthIndexLabel,
  healthIndexAccent,
  healthIndexBarColor,
  healthIndexChartColor,
  adherenceRateTextColor,
  adherenceRateBarClass,
  trendDirectionTextColor,
} from "@/libs/utils/health-index"

const COLOR_SUCCESS = "text-status-success"
const COLOR_WARNING = "text-status-warning"
const COLOR_DANGER = "text-status-danger"

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

  it.each([
    [62, "Saudável"],
    [100, "Saudável"],
    [37, "Atenção"],
    [61, "Atenção"],
    [0, "Crítico"],
    [36, "Crítico"],
  ] as [number, string][])(
    "healthIndexLabel(%i) → %s",
    (index, expected) => {
      expect(healthIndexLabel(index)).toBe(expected)
    },
  )
})

describe("healthIndexAccent", () => {
  it("returns muted for null", () => {
    expect(healthIndexAccent(null)).toBe("text-muted-foreground")
  })

  it("returns green for healthy range", () => {
    expect(healthIndexAccent(75)).toBe(COLOR_SUCCESS)
  })

  it("returns yellow for warning range", () => {
    expect(healthIndexAccent(50)).toBe(COLOR_WARNING)
  })

  it("returns red for critical range", () => {
    expect(healthIndexAccent(20)).toBe(COLOR_DANGER)
  })
})

describe("healthIndexBarColor", () => {
  it("returns green for healthy", () => {
    expect(healthIndexBarColor(80)).toBe("bg-status-success")
  })

  it("returns yellow for warning", () => {
    expect(healthIndexBarColor(50)).toBe("bg-status-warning")
  })

  it("returns red for critical", () => {
    expect(healthIndexBarColor(10)).toBe("bg-status-danger")
  })
})

describe("healthIndexChartColor", () => {
  it("returns green hex for healthy", () => {
    expect(healthIndexChartColor(70)).toBe("var(--status-success)")
  })

  it("returns amber hex for warning", () => {
    expect(healthIndexChartColor(50)).toBe("var(--status-warning)")
  })

  it("returns red hex for critical", () => {
    expect(healthIndexChartColor(20)).toBe("var(--status-danger)")
  })
})

describe("adherenceRateTextColor", () => {
  it("returns success color when rate >= 80", () => {
    expect(adherenceRateTextColor(80)).toBe(COLOR_SUCCESS)
    expect(adherenceRateTextColor(100)).toBe(COLOR_SUCCESS)
  })

  it("returns warning color when rate >= 50 and < 80", () => {
    expect(adherenceRateTextColor(50)).toBe(COLOR_WARNING)
    expect(adherenceRateTextColor(79)).toBe(COLOR_WARNING)
  })

  it("returns danger color when rate < 50", () => {
    expect(adherenceRateTextColor(49)).toBe(COLOR_DANGER)
    expect(adherenceRateTextColor(0)).toBe(COLOR_DANGER)
  })
})

describe("adherenceRateBarClass", () => {
  it("returns success bar class when rate >= 80", () => {
    expect(adherenceRateBarClass(80)).toBe("bg-status-success")
    expect(adherenceRateBarClass(95)).toBe("bg-status-success")
  })

  it("returns warning bar class when rate >= 50 and < 80", () => {
    expect(adherenceRateBarClass(60)).toBe("bg-status-warning")
  })

  it("returns danger bar class when rate < 50", () => {
    expect(adherenceRateBarClass(20)).toBe("bg-status-danger")
  })
})

describe("trendDirectionTextColor", () => {
  it("returns success color for up trend", () => {
    expect(trendDirectionTextColor("up")).toBe(COLOR_SUCCESS)
  })

  it("returns danger color for down trend", () => {
    expect(trendDirectionTextColor("down")).toBe(COLOR_DANGER)
  })

  it("returns muted color for stable trend", () => {
    expect(trendDirectionTextColor("stable")).toBe("text-muted-foreground")
  })

  it("returns muted color for null trend", () => {
    expect(trendDirectionTextColor(null)).toBe("text-muted-foreground")
  })
})
