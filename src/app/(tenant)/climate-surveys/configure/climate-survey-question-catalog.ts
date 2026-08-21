import {
  CLIMATE_SURVEY_DIMENSION_LABELS,
  CLIMATE_SURVEY_DIMENSION_ORDER,
  type ClimateSurveyDimension,
  type ScoreDirection,
} from "@/modules/climate-surveys/climate-survey.types"

export interface ClimateSurveyCatalogQuestion {
  id: string
  text: string
  dimension: ClimateSurveyDimension
  scoreDirection: ScoreDirection
}

export const CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MIN = 3
export const CLIMATE_SURVEY_RECOMMENDED_QUESTIONS_PER_TOPIC_MAX = 5
export const CLIMATE_SURVEY_SECONDS_PER_QUESTION = 20

export const CLIMATE_SURVEY_QUESTION_CATALOG: ClimateSurveyCatalogQuestion[] = [
  { id: "job_satisfaction-1", dimension: "job_satisfaction", scoreDirection: "higher_is_better", text: "Você tem as ferramentas necessárias para realizar suas tarefas?" },
  { id: "job_satisfaction-2", dimension: "job_satisfaction", scoreDirection: "higher_is_better", text: "Você está satisfeito com o ambiente de trabalho?" },
  { id: "job_satisfaction-3", dimension: "job_satisfaction", scoreDirection: "higher_is_better", text: "Você se sente motivado nas atividades que realiza?" },
  { id: "job_satisfaction-4", dimension: "job_satisfaction", scoreDirection: "higher_is_better", text: "Você recomendaria a empresa como um bom lugar para trabalhar?" },

  { id: "internal_communication-1", dimension: "internal_communication", scoreDirection: "higher_is_better", text: "Você se sente bem informado sobre mudanças importantes?" },
  { id: "internal_communication-2", dimension: "internal_communication", scoreDirection: "higher_is_better", text: "Os canais de comunicação são eficazes?" },
  { id: "internal_communication-3", dimension: "internal_communication", scoreDirection: "higher_is_better", text: "Você recebe orientação sobre comunicação no trabalho?" },
  { id: "internal_communication-4", dimension: "internal_communication", scoreDirection: "higher_is_better", text: "A comunicação aumenta seu senso de pertencimento?" },

  { id: "relationships-1", dimension: "relationships", scoreDirection: "higher_is_better", text: "Você recebe apoio dos colegas?" },
  { id: "relationships-2", dimension: "relationships", scoreDirection: "higher_is_better", text: "Existe respeito entre os colaboradores?" },
  { id: "relationships-3", dimension: "relationships", scoreDirection: "higher_is_better", text: "Você confia nos superiores para resolver conflitos?" },
  { id: "relationships-4", dimension: "relationships", scoreDirection: "higher_is_better", text: "Os superiores são justos e imparciais?" },

  { id: "recognition_reward-1", dimension: "recognition_reward", scoreDirection: "higher_is_better", text: "Você se sente valorizado pela liderança?" },
  { id: "recognition_reward-2", dimension: "recognition_reward", scoreDirection: "higher_is_better", text: "Seus esforços são reconhecidos além do financeiro?" },
  { id: "recognition_reward-3", dimension: "recognition_reward", scoreDirection: "higher_is_better", text: "Você está satisfeito com os benefícios?" },
  { id: "recognition_reward-4", dimension: "recognition_reward", scoreDirection: "higher_is_better", text: "As recompensas aumentam sua motivação?" },

  { id: "professional_development-1", dimension: "professional_development", scoreDirection: "higher_is_better", text: "Existem oportunidades de crescimento?" },
  { id: "professional_development-2", dimension: "professional_development", scoreDirection: "higher_is_better", text: "Você entende os critérios de promoção?" },
  { id: "professional_development-3", dimension: "professional_development", scoreDirection: "higher_is_better", text: "É encorajado a buscar novos desafios?" },
  { id: "professional_development-4", dimension: "professional_development", scoreDirection: "higher_is_better", text: "Os gestores apoiam seu desenvolvimento?" },

  { id: "work_life_balance-1", dimension: "work_life_balance", scoreDirection: "higher_is_better", text: "Você consegue equilibrar vida pessoal e trabalho?" },
  { id: "work_life_balance-2", dimension: "work_life_balance", scoreDirection: "higher_is_better", text: "Tem flexibilidade suficiente?" },
  { id: "work_life_balance-3", dimension: "work_life_balance", scoreDirection: "higher_is_better", text: "A cultura respeita esse equilíbrio?" },
  { id: "work_life_balance-4", dimension: "work_life_balance", scoreDirection: "higher_is_better", text: "A empresa apoia saúde mental e física?" },

  { id: "organizational_culture-1", dimension: "organizational_culture", scoreDirection: "higher_is_better", text: "Você se identifica com os valores da empresa?" },
  { id: "organizational_culture-2", dimension: "organizational_culture", scoreDirection: "higher_is_better", text: "Existe colaboração entre equipes?" },
  { id: "organizational_culture-3", dimension: "organizational_culture", scoreDirection: "higher_is_better", text: "O ambiente é respeitoso e inclusivo?" },
  { id: "organizational_culture-4", dimension: "organizational_culture", scoreDirection: "higher_is_better", text: "A cultura gera pertencimento?" },

  { id: "leadership_trust-1", dimension: "leadership_trust", scoreDirection: "higher_is_better", text: "Você confia nas decisões da liderança?" },
  { id: "leadership_trust-2", dimension: "leadership_trust", scoreDirection: "higher_is_better", text: "A liderança se preocupa com o bem-estar das pessoas?" },
  { id: "leadership_trust-3", dimension: "leadership_trust", scoreDirection: "higher_is_better", text: "A liderança é justa e imparcial?" },
  { id: "leadership_trust-4", dimension: "leadership_trust", scoreDirection: "higher_is_better", text: "A liderança inspira e motiva?" },
]

export function getClimateSurveyCatalogByTopic(): {
  dimension: ClimateSurveyDimension
  label: string
  questions: ClimateSurveyCatalogQuestion[]
}[] {
  return CLIMATE_SURVEY_DIMENSION_ORDER.map((dimension) => ({
    dimension,
    label: CLIMATE_SURVEY_DIMENSION_LABELS[dimension],
    questions: CLIMATE_SURVEY_QUESTION_CATALOG.filter((q) => q.dimension === dimension),
  }))
}

export function estimateClimateSurveyResponseMinutes(questionCount: number): number {
  if (questionCount <= 0) return 0
  return Math.max(1, Math.ceil((questionCount * CLIMATE_SURVEY_SECONDS_PER_QUESTION) / 60))
}

export function matchCatalogIdsFromQuestions(
  questions: { text: string; dimension: ClimateSurveyDimension }[],
): Set<string> {
  const selected = new Set<string>()
  for (const question of questions) {
    const match = CLIMATE_SURVEY_QUESTION_CATALOG.find(
      (catalog) => catalog.text === question.text && catalog.dimension === question.dimension,
    )
    if (match !== undefined) selected.add(match.id)
  }
  return selected
}
