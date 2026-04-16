import { z } from "zod"

export const createActionPlanSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.coerce.date().optional(),
})

export const createActionPlanTaskSchema = z.object({
  title: z.string().min(1).max(200),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
})

export const updateActionPlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.coerce.date().nullable().optional(),
})
