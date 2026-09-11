import { describe, it, expect, vi, beforeEach } from "vitest"
import { extractClimateSurveyQuestionsFromFile } from "@/modules/climate-surveys/climate-survey-import.service"
import { listClimateSurveyTopics } from "@/modules/climate-surveys/climate-survey-topic.service"
import type { IAIService } from "@/libs/integrations/ai/ai.interface"
import type { ClimateSurveyTopic } from "@/modules/climate-surveys/climate-survey.types"

vi.mock("@/modules/climate-surveys/climate-survey-topic.service")
vi.mock("@/libs/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
  }),
}))

const mockGenerate = vi.fn()
const MOCK_AI_SERVICE = { generate: mockGenerate } as IAIService

vi.mock("@/libs/integrations", () => ({
  getAIService: () => MOCK_AI_SERVICE,
}))

const TENANT_ID = "tenant-1"

const TOPICS: ClimateSurveyTopic[] = [
  {
    id: "t-1",
    tenantId: TENANT_ID,
    key: "leadership_trust",
    label: "Liderança",
    isSystem: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "t-2",
    tenantId: TENANT_ID,
    key: "work_life_balance",
    label: "Equilíbrio",
    isSystem: true,
    isActive: true,
    sortOrder: 2,
  },
]

const mockListTopics = vi.mocked(listClimateSurveyTopics)

function toolCall(argumentsValue: unknown): { id: string; name: string; arguments: string } {
  return {
    id: "call-1",
    name: "save_climate_survey_question",
    arguments: JSON.stringify(argumentsValue),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockListTopics.mockResolvedValue(TOPICS)
  mockGenerate.mockResolvedValue({ text: null, toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } })
})

describe("extractClimateSurveyQuestionsFromFile", () => {
  it("extrai e valida perguntas mapeando o tópico existente", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        toolCall({ text: "Confio na minha liderança.", dimension: "leadership_trust", scoreDirection: "higher_is_better" }),
        toolCall({ text: "Sinto-me sobrecarregado.", dimension: "work_life_balance", scoreDirection: "lower_is_better" }),
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    const questions = await extractClimateSurveyQuestionsFromFile(TENANT_ID, "1. Confio na minha liderança.")

    expect(questions).toEqual([
      { text: "Confio na minha liderança.", dimension: "leadership_trust", scoreDirection: "higher_is_better" },
      { text: "Sinto-me sobrecarregado.", dimension: "work_life_balance", scoreDirection: "lower_is_better" },
    ])
    expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ tier: "medium" }))
  })

  it("usa o tópico padrão quando a dimensão não existe no tenant", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [toolCall({ text: "Pergunta qualquer.", dimension: "topico-inexistente", scoreDirection: "higher_is_better" })],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    const questions = await extractClimateSurveyQuestionsFromFile(TENANT_ID, "conteúdo")

    expect(questions[0]?.dimension).toBe("organizational_culture")
  })

  it("lança AppError quando o conteúdo está vazio", async () => {
    await expect(extractClimateSurveyQuestionsFromFile(TENANT_ID, "   ")).rejects.toMatchObject({
      code: "CLIMATE_SURVEY_IMPORT_EMPTY",
    })
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it("lança AppError quando nenhuma pergunta é identificada", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [toolCall({ text: "x", dimension: "leadership_trust", scoreDirection: "higher_is_better" })],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    await expect(extractClimateSurveyQuestionsFromFile(TENANT_ID, "conteúdo")).rejects.toMatchObject({
      code: "CLIMATE_SURVEY_IMPORT_NO_QUESTIONS",
    })
  })

  it("ignora tool calls inválidas ou de nome desconhecido", async () => {
    mockGenerate.mockResolvedValue({
      text: null,
      toolCalls: [
        { id: "call-1", name: "outra_tool", arguments: "{}" },
        { id: "call-2", name: "save_climate_survey_question", arguments: "não é json" },
        {
          id: "call-3",
          name: "save_climate_survey_question",
          arguments: JSON.stringify({ text: "ok", dimension: "leadership_trust", scoreDirection: "invalido" }),
        },
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    await expect(extractClimateSurveyQuestionsFromFile(TENANT_ID, "conteúdo")).rejects.toMatchObject({
      code: "CLIMATE_SURVEY_IMPORT_NO_QUESTIONS",
    })
  })
})
