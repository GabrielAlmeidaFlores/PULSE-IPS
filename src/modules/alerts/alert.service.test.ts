import { describe, it, expect } from "vitest"
import { normalizeItemScore, calcAvgFromResponses } from "@/modules/alerts/alert.service"

describe("normalizeItemScore", () => {
  it("returns score as-is for higher_is_better direction", () => {
    expect(normalizeItemScore(4, "higher_is_better")).toBe(4)
    expect(normalizeItemScore(1, "higher_is_better")).toBe(1)
    expect(normalizeItemScore(5, "higher_is_better")).toBe(5)
  })

  it("inverts score for lower_is_better direction", () => {
    expect(normalizeItemScore(1, "lower_is_better")).toBe(5)
    expect(normalizeItemScore(5, "lower_is_better")).toBe(1)
    expect(normalizeItemScore(3, "lower_is_better")).toBe(3)
    expect(normalizeItemScore(2, "lower_is_better")).toBe(4)
  })
})

describe("calcAvgFromResponses", () => {
  it("returns 0 for empty responses array", () => {
    expect(calcAvgFromResponses([])).toBe(0)
  })

  it("returns 0 for responses with no items", () => {
    expect(calcAvgFromResponses([{ items: [] }])).toBe(0)
  })

  it("calculates correct average for single response", () => {
    const responses = [
      {
        items: [
          { score: 4, question: { scoreDirection: "higher_is_better" } },
          { score: 2, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(3)
  })

  it("normalizes lower_is_better scores before averaging", () => {
    const responses = [
      {
        items: [
          { score: 2, question: { scoreDirection: "lower_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(4)
  })

  it("averages across multiple responses and items", () => {
    const responses = [
      {
        items: [
          { score: 5, question: { scoreDirection: "higher_is_better" } },
          { score: 3, question: { scoreDirection: "higher_is_better" } },
        ],
      },
      {
        items: [
          { score: 4, question: { scoreDirection: "higher_is_better" } },
          { score: 4, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(4)
  })

  it("mixes higher_is_better and lower_is_better in same response", () => {
    const responses = [
      {
        items: [
          { score: 5, question: { scoreDirection: "higher_is_better" } },
          { score: 1, question: { scoreDirection: "lower_is_better" } },
        ],
      },
    ]
    expect(calcAvgFromResponses(responses)).toBe(5)
  })

  it("triggers low_score threshold detection at score below 3", () => {
    const responses = [
      {
        items: [
          { score: 2, question: { scoreDirection: "higher_is_better" } },
          { score: 1, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    const avg = calcAvgFromResponses(responses)
    expect(avg).toBe(1.5)
    expect(avg < 3).toBe(true)
  })

  it("does NOT trigger low_score threshold when score is above 3", () => {
    const responses = [
      {
        items: [
          { score: 4, question: { scoreDirection: "higher_is_better" } },
          { score: 5, question: { scoreDirection: "higher_is_better" } },
        ],
      },
    ]
    const avg = calcAvgFromResponses(responses)
    expect(avg).toBe(4.5)
    expect(avg < 3).toBe(false)
  })
})
