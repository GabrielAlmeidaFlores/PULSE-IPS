import { AppError } from "@/libs/errors/app-error"
import { getAIService } from "@/libs/integrations"
import type { AIToolDefinition } from "@/libs/integrations/ai/ai.interface"
import { createLogger } from "@/libs/utils/logger"
import { climateSurveyQuestionImportToolSchema } from "@/modules/climate-surveys/climate-survey-import.schema"
import { listClimateSurveyTopics } from "@/modules/climate-surveys/climate-survey-topic.service"
import {
  CLIMATE_SURVEY_MAX_QUESTIONS,
  type ClimateSurveyDimension,
  type ClimateSurveyTopic,
  type ScoreDirection,
} from "@/modules/climate-surveys/climate-survey.types"

const logger = createLogger("climate-survey-import")

const MAX_SOURCE_CHARS_PER_AI_CALL = 20000

const DEFAULT_IMPORT_DIMENSION: ClimateSurveyDimension = "organizational_culture"

export interface ExtractedClimateSurveyQuestion {
  text: string
  dimension: ClimateSurveyDimension
  scoreDirection: ScoreDirection
}

const SAVE_CLIMATE_SURVEY_QUESTION_TOOL: AIToolDefinition = {
  name: "save_climate_survey_question",
  description: "Salva uma pergunta de pesquisa de clima extraída do arquivo enviado.",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "Texto da pergunta, sem numeração. Ex.: 'Sinto que meu trabalho é reconhecido.'" },
      dimension: {
        type: "string",
        description: "Chave (key) do tópico ao qual a pergunta pertence. Use uma das chaves disponíveis.",
      },
      scoreDirection: {
        type: "string",
        enum: ["higher_is_better", "lower_is_better"],
        description: "Direção do score: 'higher_is_better' (concordar é positivo) ou 'lower_is_better' (concordar é negativo).",
      },
    },
    required: ["text", "dimension", "scoreDirection"],
  },
}

function parseJsonArguments(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function buildSystemPrompt(topics: ClimateSurveyTopic[]): string {
  const topicLines = topics
    .filter((topic) => topic.isActive)
    .map((topic) => `- ${topic.key} (${topic.label})`)
    .join("\n")
  return [
    "Você extrai perguntas de uma pesquisa de clima organizacional existente (planilha ou texto).",
    "Para cada pergunta encontrada, chame a ferramenta save_climate_survey_question.",
    "Regras:",
    "- Ignore cabeçalhos, instruções de preenchimento e linhas que não sejam perguntas.",
    "- Remova numeração e rótulos (ex.: '1.', 'P1 -').",
    "- Atribua a cada pergunta uma das chaves de tópico abaixo (coluna dimension).",
    "- Se a pergunta expressar algo negativo quando concordada (ex.: 'sinto-me sobrecarregado'), use 'lower_is_better'; caso contrário, use 'higher_is_better'.",
    `- Extraia no máximo ${String(CLIMATE_SURVEY_MAX_QUESTIONS)} perguntas.`,
    "Tópicos disponíveis:",
    topicLines,
  ].join("\n")
}

export async function extractClimateSurveyQuestionsFromFile(
  tenantId: string,
  sourceText: string,
): Promise<ExtractedClimateSurveyQuestion[]> {
  const normalized = sourceText.trim()
  if (normalized.length === 0) {
    throw new AppError("CLIMATE_SURVEY_IMPORT_EMPTY", "Não foi possível ler o conteúdo do arquivo enviado.")
  }

  const topics = await listClimateSurveyTopics(tenantId)
  const activeTopicKeys = new Set(topics.filter((topic) => topic.isActive).map((topic) => topic.key))

  const ai = getAIService()
  const result = await ai.generate({
    system: buildSystemPrompt(topics),
    messages: [{ role: "user", content: normalized.slice(0, MAX_SOURCE_CHARS_PER_AI_CALL) }],
    tools: [SAVE_CLIMATE_SURVEY_QUESTION_TOOL],
    tier: "medium",
  })

  const questions: ExtractedClimateSurveyQuestion[] = []
  for (const call of result.toolCalls) {
    if (call.name !== SAVE_CLIMATE_SURVEY_QUESTION_TOOL.name) continue
    const parsed = climateSurveyQuestionImportToolSchema.safeParse(parseJsonArguments(call.arguments))
    if (!parsed.success) {
      logger.warn("pergunta inválida ignorada na importação de pesquisa de clima")
      continue
    }
    const dimension = activeTopicKeys.has(parsed.data.dimension)
      ? parsed.data.dimension
      : DEFAULT_IMPORT_DIMENSION
    questions.push({ text: parsed.data.text, dimension, scoreDirection: parsed.data.scoreDirection })
  }

  if (questions.length === 0) {
    throw new AppError("CLIMATE_SURVEY_IMPORT_NO_QUESTIONS", "Nenhuma pergunta foi identificada no arquivo.")
  }

  return questions.slice(0, CLIMATE_SURVEY_MAX_QUESTIONS)
}
