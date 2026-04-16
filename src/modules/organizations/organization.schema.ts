import { z } from "zod"

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  planId: z.string().uuid().optional(),
  timezone: z.string().optional(),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
  maxEmployeesOverride: z.number().int().positive().nullable().optional(),
})
