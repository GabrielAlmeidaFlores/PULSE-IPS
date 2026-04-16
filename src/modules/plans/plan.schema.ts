import { z } from "zod"

export const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  maxEmployees: z.number().int().positive(),
})

export const updatePlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  maxEmployees: z.number().int().positive(),
  isActive: z.boolean(),
})

export const createPlanPriceSchema = z.object({
  planId: z.string().uuid(),
  unitAmountInCents: z.number().int().positive(),
  currency: z.string().length(3),
  interval: z.enum(["month", "year"]),
})
