export interface ClimateSurveyActionPlaybook {
  what: string
  who: string
  when: string
  how: string
}

export const CLIMATE_SURVEY_DEFAULT_ACTION_PLAYBOOK: ClimateSurveyActionPlaybook = {
  what: "Plano de ação para recuperar o indicador do tópico",
  who: "RH & Gente + Liderança",
  when: "Ciclo de 90 dias, revisão mensal",
  how: "Diagnóstico com os times, definição de responsáveis e marcos, e acompanhamento mensal do indicador",
}

export const CLIMATE_SURVEY_ACTION_PLAYBOOKS: Record<string, ClimateSurveyActionPlaybook> = {
  job_satisfaction: {
    what: "Programa de melhoria da satisfação no trabalho",
    who: "RH & Gente + Liderança da área",
    when: "Ciclo de 90 dias, revisão mensal",
    how: "Escuta ativa com os times, revisão de carga e metas, e reconhecimento recorrente no dia a dia",
  },
  internal_communication: {
    what: "Plano de comunicação interna com rituais e canais definidos",
    who: "RH & Gente + Comunicação",
    when: "60 dias",
    how: "Definir canais oficiais, calendário de comunicados, feedback de mão dupla e transparência sobre decisões",
  },
  relationships: {
    what: "Programa de convivência e colaboração entre times",
    who: "RH & Gente + Liderança",
    when: "90 dias",
    how: "Encontros de integração, acordos de convivência, mediação de conflitos e rituais de colaboração",
  },
  recognition_reward: {
    what: "Programa de reconhecimento e revisão de recompensas",
    who: "RH & Gente + Financeiro",
    when: "Ciclo de 90 dias, revisão no ciclo orçamentário",
    how: "Rituais de reconhecimento, critérios transparentes de mérito e revisão de faixas salariais",
  },
  professional_development: {
    what: "Plano de desenvolvimento e trilhas de carreira",
    who: "RH & Gente",
    when: "120 dias",
    how: "Matriz de competências, trilhas internas, PDI individual e ciclo semestral de promoção",
  },
  work_life_balance: {
    what: "Programa de equilíbrio entre vida pessoal e trabalho",
    who: "RH & Gente + Liderança",
    when: "90 dias",
    how: "Revisão de jornada e sobrecarga, direito à desconexão, flexibilidade e monitoramento de horas extras",
  },
  organizational_culture: {
    what: "Programa de fortalecimento da cultura organizacional",
    who: "RH & Gente + Diretoria",
    when: "120 dias",
    how: "Definir e comunicar valores, rituais que reforçam a cultura e liderança pelo exemplo",
  },
  leadership_trust: {
    what: "Trilha de desenvolvimento de lideranças e confiança",
    who: "RH & Gente + Diretoria",
    when: "6 meses",
    how: "Avaliação 180º, mentoria, 1:1 quinzenal auditável e feedback estruturado",
  },
}
