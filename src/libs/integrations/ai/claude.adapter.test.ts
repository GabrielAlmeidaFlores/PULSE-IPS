import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ClaudeAdapter } from "@/libs/integrations/ai/claude.adapter"

vi.mock("@/env", () => ({
  env: {
    ANTHROPIC_API_KEY: "test-key",
    ANTHROPIC_MODELS_HIGH: undefined,
    ANTHROPIC_MODELS_MEDIUM: undefined,
    ANTHROPIC_MODELS_LOW: undefined,
    AI_MAX_TOKENS: 100,
    AI_TEMPERATURE: 0,
  },
}))

vi.mock("@/libs/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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

describe("ClaudeAdapter", () => {
  it("mapeia texto, tool calls e usage da resposta", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        content: [
          { type: "text", text: "extraído" },
          { type: "tool_use", id: "toolu-1", name: "save_employee_monthly", input: { employeeName: "Ana" } },
        ],
        usage: { input_tokens: 12, output_tokens: 7 },
      }),
    )

    const result = await new ClaudeAdapter().generate({
      system: "sistema",
      messages: [{ role: "user", content: "arquivo" }],
      tools: [
        {
          name: "save_employee_monthly",
          description: "salva",
          parameters: { type: "object", properties: { employeeName: { type: "string" } }, required: ["employeeName"] },
        },
      ],
    })

    expect(result.text).toBe("extraído")
    expect(result.toolCalls).toEqual([
      { id: "toolu-1", name: "save_employee_monthly", arguments: JSON.stringify({ employeeName: "Ana" }) },
    ])
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 7 })
  })

  it("envia as tools no formato input_schema", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ content: [] }))

    await new ClaudeAdapter().generate({
      system: "sistema",
      messages: [{ role: "user", content: "arquivo" }],
      tools: [{ name: "t", description: "d", parameters: { type: "object", properties: {} } }],
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      tools: { name: string; input_schema: { type: string } }[]
    }
    expect(body.tools[0]?.name).toBe("t")
    expect(body.tools[0]?.input_schema.type).toBe("object")
  })

  it("lança erro quando a requisição falha", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("rate limited"),
      json: () => Promise.resolve({}),
    } as Response)

    await expect(
      new ClaudeAdapter().generate({ system: "s", messages: [{ role: "user", content: "c" }] }),
    ).rejects.toThrow("Claude request failed (429)")
  })

  it("faz fallback para o próximo modelo do tier quando o primeiro falha", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve("unavailable"),
        json: () => Promise.resolve({}),
      } as Response)
      .mockResolvedValueOnce(jsonResponse({ content: [{ type: "text", text: "ok no segundo" }] }))

    const result = await new ClaudeAdapter().generate({
      system: "s",
      messages: [{ role: "user", content: "c" }],
      tier: "high",
    })

    expect(result.text).toBe("ok no segundo")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ model: "claude-3-5-sonnet-latest" })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ model: "claude-3-opus-latest" })
  })
})
