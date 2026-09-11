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

const DEFAULT_OPENAI_MODELS: Record<AIModelTier, string[]> = {
  high: ["gpt-4o", "gpt-4-turbo", "gpt-4o-mini"],
  medium: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
  low: ["gpt-4o-mini", "gpt-3.5-turbo", "gpt-4o"],
}

const openAiToolCallSchema = z.object({
  id: z.string(),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
})

const openAiResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
        tool_calls: z.array(openAiToolCallSchema).optional(),
      }),
    }),
  ),
  usage: z
    .object({ prompt_tokens: z.number(), completion_tokens: z.number() })
    .optional(),
})

function resolveOpenAIModels(tier: AIModelTier): string[] {
  const overrides: Record<AIModelTier, string | undefined> = {
    high: env.OPENAI_MODELS_HIGH,
    medium: env.OPENAI_MODELS_MEDIUM,
    low: env.OPENAI_MODELS_LOW,
  }
  return parseAIModelList(overrides[tier]) ?? DEFAULT_OPENAI_MODELS[tier]
}

export class OpenAIAdapter implements IAIService {
  generate(params: AIGenerateParams): Promise<AIGenerateResult> {
    const apiKey = env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OpenAI não configurado: defina OPENAI_API_KEY.")
    }
    const tier = resolveAIModelTier(params.tier)
    const models = resolveOpenAIModels(tier)
    return runWithAIModelFallback(models, (model) => this.callModel(model, params, apiKey))
  }

  private async callModel(model: string, params: AIGenerateParams, apiKey: string): Promise<AIGenerateResult> {
    const messages = [
      { role: "system", content: params.system },
      ...params.messages.map((message) => {
        if (message.role === "tool" && message.toolCallId !== undefined) {
          return { role: "tool", content: message.content, tool_call_id: message.toolCallId }
        }
        return { role: message.role, content: message.content }
      }),
    ]

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: params.temperature ?? env.AI_TEMPERATURE,
      max_tokens: params.maxTokens ?? env.AI_MAX_TOKENS,
    }
    if (params.tools !== undefined && params.tools.length > 0) {
      body["tools"] = params.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }))
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI request failed (${String(response.status)}): ${errorText}`)
    }

    const parsed = openAiResponseSchema.safeParse(await response.json())
    if (!parsed.success) throw new Error("Resposta inesperada da OpenAI.")

    const choice = parsed.data.choices[0]
    const toolCalls: AIToolCall[] = (choice?.message.tool_calls ?? []).map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: call.function.arguments,
    }))

    return {
      text: choice?.message.content ?? null,
      toolCalls,
      usage: {
        inputTokens: parsed.data.usage?.prompt_tokens ?? 0,
        outputTokens: parsed.data.usage?.completion_tokens ?? 0,
      },
    }
  }
}
