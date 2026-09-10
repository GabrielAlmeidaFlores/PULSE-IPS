import { z } from "zod"
import { env } from "@/env"
import type {
  AIGenerateParams,
  AIGenerateResult,
  AIModelTier,
  AIToolCall,
  IAIService,
} from "@/libs/integrations/ai/ai.interface"
import {
  parseAIModelList,
  resolveAIModelTier,
  runWithAIModelFallback,
} from "@/libs/integrations/ai/ai-model-tier"
import type { JsonValue } from "@/libs/utils/json"

const DEFAULT_GEMINI_MODELS: Record<AIModelTier, string[]> = {
  high: ["gemini-2.5-pro", "gemini-pro-latest", "gemini-3.5-flash"],
  medium: ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.5-flash"],
  low: ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash"],
}

const geminiFunctionCallSchema = z.object({
  name: z.string(),
  args: z.unknown().optional(),
})

const geminiPartSchema = z.object({
  text: z.string().optional(),
  functionCall: geminiFunctionCallSchema.optional(),
})

const geminiResponseSchema = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(geminiPartSchema) }) }))
    .optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().optional(),
      candidatesTokenCount: z.number().optional(),
    })
    .optional(),
})

function resolveGeminiModels(tier: AIModelTier): string[] {
  const overrides: Record<AIModelTier, string | undefined> = {
    high: env.GEMINI_MODELS_HIGH,
    medium: env.GEMINI_MODELS_MEDIUM,
    low: env.GEMINI_MODELS_LOW,
  }
  return parseAIModelList(overrides[tier]) ?? DEFAULT_GEMINI_MODELS[tier]
}

const GEMINI_SCHEMA_TYPE_KEYWORDS = new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
  "null",
])

function toGeminiSchema(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(toGeminiSchema)
  if (value !== null && typeof value === "object") {
    const result: Record<string, JsonValue> = {}
    for (const [key, entry] of Object.entries(value)) {
      const isSchemaTypeKeyword =
        key === "type" && typeof entry === "string" && GEMINI_SCHEMA_TYPE_KEYWORDS.has(entry)
      result[key] = isSchemaTypeKeyword && typeof entry === "string" ? entry.toUpperCase() : toGeminiSchema(entry)
    }
    return result
  }
  return value
}

export class GeminiAdapter implements IAIService {
  generate(params: AIGenerateParams): Promise<AIGenerateResult> {
    const apiKey = env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("Gemini não configurado: defina GEMINI_API_KEY.")
    }
    const tier = resolveAIModelTier(params.tier)
    const models = resolveGeminiModels(tier)
    return runWithAIModelFallback(models, (model) => this.callModel(model, params, apiKey))
  }

  private async callModel(model: string, params: AIGenerateParams, apiKey: string): Promise<AIGenerateResult> {
    const contents = params.messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }))

    const body: Record<string, unknown> = {
      system_instruction: { parts: [{ text: params.system }] },
      contents,
      generationConfig: {
        temperature: params.temperature ?? env.AI_TEMPERATURE,
        maxOutputTokens: params.maxTokens ?? env.AI_MAX_TOKENS,
      },
    }
    if (params.tools !== undefined && params.tools.length > 0) {
      body["tools"] = [
        {
          function_declarations: params.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: toGeminiSchema(tool.parameters),
          })),
        },
      ]
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini request failed (${String(response.status)}): ${errorText}`)
    }

    const parsed = geminiResponseSchema.safeParse(await response.json())
    if (!parsed.success) throw new Error("Resposta inesperada do Gemini.")

    const parts = parsed.data.candidates?.[0]?.content.parts ?? []
    const textParts: string[] = []
    const toolCalls: AIToolCall[] = []
    parts.forEach((part, index) => {
      if (part.text !== undefined) textParts.push(part.text)
      if (part.functionCall !== undefined) {
        toolCalls.push({
          id: `gemini-call-${String(index)}`,
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args ?? {}),
        })
      }
    })

    return {
      text: textParts.length > 0 ? textParts.join("\n") : null,
      toolCalls,
      usage: {
        inputTokens: parsed.data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: parsed.data.usageMetadata?.candidatesTokenCount ?? 0,
      },
    }
  }
}
