import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { OpenAIAdapter } from "@/libs/integrations/ai/openai.adapter"

vi.mock("@/env", () => ({
  env: {
    OPENAI_API_KEY: "test-key",
    OPENAI_MODELS_HIGH: undefined,
    OPENAI_MODELS_MEDIUM: undefined,
    OPENAI_MODELS_LOW: undefined,
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

describe("OpenAIAdapter", () => {
  it("mapeia texto, tool calls e usage da resposta", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content: "extraído",
              tool_calls: [
                {
                  id: "call-1",
                  function: { name: "save_employee_monthly", arguments: JSON.stringify({ employeeName: "Ana" }) },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 12, completion_tokens: 7 },
      }),
    )

    const result = await new OpenAIAdapter().generate({
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
      { id: "call-1", name: "save_employee_monthly", arguments: JSON.stringify({ employeeName: "Ana" }) },
    ])
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 7 })
  })

  it("envia as tools no formato function calling", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [] }))

    await new OpenAIAdapter().generate({
      system: "sistema",
      messages: [{ role: "user", content: "arquivo" }],
      tools: [{ name: "t", description: "d", parameters: { type: "object", properties: {} } }],
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      tools: { type: string; function: { name: string } }[]
    }
    expect(body.tools[0]?.type).toBe("function")
    expect(body.tools[0]?.function.name).toBe("t")
  })

  it("lança erro quando a requisição falha", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("rate limited"),
      json: () => Promise.resolve({}),
    } as Response)

    await expect(
      new OpenAIAdapter().generate({ system: "s", messages: [{ role: "user", content: "c" }] }),
    ).rejects.toThrow("OpenAI request failed (429)")
  })

  it("faz fallback para o próximo modelo do tier quando o primeiro falha", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve("unavailable"),
        json: () => Promise.resolve({}),
      } as Response)
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "ok no segundo" } }] }))

    const result = await new OpenAIAdapter().generate({
      system: "s",
      messages: [{ role: "user", content: "c" }],
      tier: "high",
    })

    expect(result.text).toBe("ok no segundo")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ model: "gpt-4o" })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ model: "gpt-4-turbo" })
  })
})
