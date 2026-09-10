import { z } from "zod"

export const workforceInsightToolSchema = z.object({
  kind: z.enum(["root_cause", "burnout_risk", "action_suggestion"]),
  severity: z.enum(["high", "medium", "low"]),
  departmentName: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
})

export type WorkforceInsightToolArgs = z.infer<typeof workforceInsightToolSchema>

export const workforceActionPlanToolSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10).max(2000),
  priority: z.enum(["low", "medium", "high"]),
  tasks: z.array(z.object({ title: z.string().trim().min(3).max(255) })).min(1).max(10),
})
