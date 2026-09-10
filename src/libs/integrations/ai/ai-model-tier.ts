import type { AIModelTier } from "@/libs/integrations/ai/ai.interface"
import { logger } from "@/libs/logger"

export function resolveAIModelTier(tier: AIModelTier | undefined): AIModelTier {
  return tier ?? "medium"
}

export function parseAIModelList(raw: string | undefined): string[] | null {
  if (raw === undefined) return null
  const models = raw
    .split(",")
    .map((model) => model.trim())
    .filter((model) => model.length > 0)
  return models.length > 0 ? models : null
}

export async function runWithAIModelFallback<T>(
  models: string[],
  attempt: (model: string) => Promise<T>,
): Promise<T> {
  if (models.length === 0) {
    throw new Error("Nenhum modelo de IA configurado para o tier selecionado.")
  }

  let lastError: unknown
  for (const model of models) {
    try {
      return await attempt(model)
    } catch (error) {
      lastError = error
      logger.warn(
        { model, err: error instanceof Error ? error.message : String(error) },
        "modelo de IA falhou; tentando o próximo do tier",
      )
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Todos os modelos de IA falharam.")
}
