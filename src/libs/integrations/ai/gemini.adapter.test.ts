import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GeminiAdapter } from "@/libs/integrations/ai/gemini.adapter"

vi.mock("@/env", () => ({
  env: {
    GEMINI_API_KEY: "test-key",
    GEMINI_MODELS_HIGH: undefined,
    GEMINI_MODELS_MEDIUM: undefined,
    GEMINI_MODELS_LOW: undefined,
    AI_MAX_TOKENS: 100,
    AI_TEMPERATURE: 0,
  },
}))

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(JSON.stringify(payload)),
  } as Response
}

describe("GeminiAdapter", () => {
  it("mapeia texto, tool calls e usage da resposta", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                { text: "extraído" },
                { functionCall: { name: "save_employee_monthly", args: { employeeName: "Ana" } } },
              ],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 7 },
      }),
    )

    const result = await new GeminiAdapter().generate({
      system: "sistema",
      messages: [{ role: "user", content: "arquivo" }],
      tools: [
        {
          name: "save_employee_monthly",
          description: "salva",
          parameters: { type: "object", properties: { workedHours: { type: "number" } }, required: ["employeeName"] },
        },
      ],
    })

    expect(result.text).toBe("extraído")
    expect(result.toolCalls).toEqual([
      { id: "gemini-call-1", name: "save_employee_monthly", arguments: JSON.stringify({ employeeName: "Ana" }) },
    ])
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 7 })
  })

  it("converte os tipos do schema para maiúsculas (padrão Gemini)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [] }))

    await new GeminiAdapter().generate({
      system: "sistema",
      messages: [{ role: "user", content: "arquivo" }],
      tools: [
        {
          name: "t",
          description: "d",
          parameters: { type: "object", properties: { hours: { type: "number" } } },
        },
      ],
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      tools: {
        function_declarations: {
          parameters: { type: string; properties: { hours: { type: string } } }
        }[]
      }[]
    }
    expect(body.tools[0]?.function_declarations[0]?.parameters.type).toBe("OBJECT")
    expect(body.tools[0]?.function_declarations[0]?.parameters.properties.hours.type).toBe("NUMBER")
  })

  it("lança erro quando a requisição falha", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("rate limited"),
      json: () => Promise.resolve({}),
    } as Response)

    await expect(
      new GeminiAdapter().generate({ system: "s", messages: [{ role: "user", content: "c" }] }),
    ).rejects.toThrow("Gemini request failed (429)")
  })

  it("faz fallback para o próximo modelo do tier quando o primeiro falha", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve("unavailable"),
        json: () => Promise.resolve({}),
      } as Response)
      .mockResolvedValueOnce(jsonResponse({ candidates: [{ content: { parts: [{ text: "ok no segundo" }] } }] }))

    const result = await new GeminiAdapter().generate({
      system: "s",
      messages: [{ role: "user", content: "c" }],
      tier: "high",
    })

    expect(result.text).toBe("ok no segundo")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-2.5-pro")
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("gemini-pro-latest")
  })
})
