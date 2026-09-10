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

const DEFAULT_ANTHROPIC_MODELS: Record<AIModelTier, string[]> = {
  high: ["claude-3-5-sonnet-latest", "claude-3-opus-latest", "claude-3-5-haiku-latest"],
  medium: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
  low: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest", "claude-3-opus-latest"],
}

const claudeContentBlockSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("tool_use"),
    id: z.string(),
    name: z.string(),
    input: z.unknown(),
  }),
])

const claudeResponseSchema = z.object({
  content: z.array(claudeContentBlockSchema),
  usage: z
    .object({ input_tokens: z.number(), output_tokens: z.number() })
    .optional(),
})

function resolveAnthropicModels(tier: AIModelTier): string[] {
  const overrides: Record<AIModelTier, string | undefined> = {
    high: env.ANTHROPIC_MODELS_HIGH,
    medium: env.ANTHROPIC_MODELS_MEDIUM,
    low: env.ANTHROPIC_MODELS_LOW,
  }
  return parseAIModelList(overrides[tier]) ?? DEFAULT_ANTHROPIC_MODELS[tier]
}

export class ClaudeAdapter implements IAIService {
  generate(params: AIGenerateParams): Promise<AIGenerateResult> {
    const apiKey = env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("Claude não configurado: defina ANTHROPIC_API_KEY.")
    }
    const tier = resolveAIModelTier(params.tier)
    const models = resolveAnthropicModels(tier)
    return runWithAIModelFallback(models, (model) => this.callModel(model, params, apiKey))
  }

  private async callModel(model: string, params: AIGenerateParams, apiKey: string): Promise<AIGenerateResult> {
    const messages = params.messages.map((message) => {
      if (message.role === "tool" && message.toolCallId !== undefined) {
        return {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: message.toolCallId, content: message.content },
          ],
        }
      }
      return { role: message.role, content: message.content }
    })

    const body: Record<string, unknown> = {
      model,
      system: params.system,
      messages,
      temperature: params.temperature ?? env.AI_TEMPERATURE,
      max_tokens: params.maxTokens ?? env.AI_MAX_TOKENS,
    }
    if (params.tools !== undefined && params.tools.length > 0) {
      body["tools"] = params.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      }))
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude request failed (${String(response.status)}): ${errorText}`)
    }

    const parsed = claudeResponseSchema.safeParse(await response.json())
    if (!parsed.success) throw new Error("Resposta inesperada do Claude.")

    const textParts: string[] = []
    const toolCalls: AIToolCall[] = []
    for (const block of parsed.data.content) {
      if (block.type === "text") {
        textParts.push(block.text)
      } else {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input ?? {}),
        })
      }
    }

    return {
      text: textParts.length > 0 ? textParts.join("\n") : null,
      toolCalls,
      usage: {
        inputTokens: parsed.data.usage?.input_tokens ?? 0,
        outputTokens: parsed.data.usage?.output_tokens ?? 0,
      },
    }
  }
}
