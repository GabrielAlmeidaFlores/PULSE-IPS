import type { JsonValue } from "@/libs/utils/json"

export type AIMessageRole = "user" | "assistant" | "tool"

export type AIModelTier = "high" | "medium" | "low"

export interface AIMessage {
  role: AIMessageRole
  content: string
  toolCallId?: string
}

export interface AIToolDefinition {
  name: string
  description: string
  parameters: JsonValue
}

export interface AIToolCall {
  id: string
  name: string
  arguments: string
}

export interface AIGenerateParams {
  system: string
  messages: AIMessage[]
  tools?: AIToolDefinition[]
  tier?: AIModelTier
  temperature?: number
  maxTokens?: number
}

export interface AIUsage {
  inputTokens: number
  outputTokens: number
}

export interface AIGenerateResult {
  text: string | null
  toolCalls: AIToolCall[]
  usage: AIUsage
}

export interface IAIService {
  generate(params: AIGenerateParams): Promise<AIGenerateResult>
}
