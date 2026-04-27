import { z } from "zod"
import { ALL_PLAN_FEATURES } from "@/modules/plans/plan.types"

export const createPlanSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  maxEmployees: z.number().int().min(0),
  features: z.array(z.enum(ALL_PLAN_FEATURES as [string, ...string[]])).default([]),
  monthlyPriceInCents: z.number().int().min(0).optional(),
  yearlyPriceInCents: z.number().int().min(0).optional(),
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

export const setPlanFeaturesSchema = z.object({
  planId: z.string().uuid(),
  features: z.array(z.enum(ALL_PLAN_FEATURES as [string, ...string[]])),
})
