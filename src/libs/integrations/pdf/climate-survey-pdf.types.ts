export interface ClimateSurveyPdfKpis {
  adherencePercent: number
  favorabilityPercent: number | null
  enps: number | null
  topicsBelowGoal: number
  totalTopics: number
  totalRecipients: number
  totalResponses: number
}

export interface ClimateSurveyPdfTopic {
  label: string
  favorabilityPercent: number | null
}

export interface ClimateSurveyPdfEnps {
  promoters: number
  neutrals: number
  detractors: number
  total: number
  score: number | null
}

export interface ClimateSurveyPdfDepartment {
  name: string
  favorabilityPercent: number | null
  enps: number | null
  respondentCount: number
}

export interface ClimateSurveyPdfHeatmapRow {
  topic: string
  values: (number | null)[]
}

export interface ClimateSurveyPdfHeatmap {
  topics: string[]
  departments: string[]
  rows: ClimateSurveyPdfHeatmapRow[]
}

export interface ClimateSurveyPdfInput {
  orgName: string
  waveLabel: string
  periodLabel: string
  generatedAt: Date
  goalPercent: number
  kpis: ClimateSurveyPdfKpis
  topics: ClimateSurveyPdfTopic[]
  enps: ClimateSurveyPdfEnps
  departments: ClimateSurveyPdfDepartment[]
  heatmap: ClimateSurveyPdfHeatmap
}
