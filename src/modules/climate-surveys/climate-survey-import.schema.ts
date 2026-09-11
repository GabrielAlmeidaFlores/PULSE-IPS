import { z } from "zod"

export const climateSurveyQuestionImportToolSchema = z.object({
  text: z.string().trim().min(3).max(500),
  dimension: z.string().trim().min(1),
  scoreDirection: z.enum(["higher_is_better", "lower_is_better"]),
})
