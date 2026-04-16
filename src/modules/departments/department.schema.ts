import { z } from "zod"

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
})

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})
