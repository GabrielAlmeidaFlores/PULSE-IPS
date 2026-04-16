import { z } from "zod"

export const createAnonymousReportSchema = z.object({
  content: z.string().min(10).max(5000),
  category: z.string().optional(),
})

export const updateAnonymousReportSchema = z.object({
  status: z.enum(["open", "analyzing", "resolved", "archived"]).optional(),
})
