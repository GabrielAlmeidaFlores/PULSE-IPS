import type { AIGenerateParams, AIGenerateResult, IAIService } from "@/libs/integrations/ai/ai.interface"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("fake-ai")

export class ConsoleAIService implements IAIService {
  generate(params: AIGenerateParams): Promise<AIGenerateResult> {
    logger.info("🤖 FAKE AI generate", {
      messages: params.messages.length,
      tools: params.tools?.length ?? 0,
    })
    logger.debug(params.system)
    return Promise.resolve({
      text: null,
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    })
  }
}
