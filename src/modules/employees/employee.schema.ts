import { z } from "zod"

export const createEmployeeSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(1).max(200),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional(),
  document: z.string().min(1).max(50).optional(),
})

export const updateEmployeeSchema = z.object({
  departmentId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().nullable().optional(),
  document: z.string().min(1).max(50).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export const importRowSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  departmentName: z.string().min(1),
  email: z.string().email().optional(),
})
