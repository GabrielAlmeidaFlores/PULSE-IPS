import { z } from "zod"
import { normalizePhoneToE164 } from "@/libs/utils/phone"

const phoneField = z.string().min(1).transform((val, ctx) => {
  const normalized = normalizePhoneToE164(val)
  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Número de telefone inválido. Use o formato +5511999999999 ou (11) 99999-9999",
    })
    return z.NEVER
  }
  return normalized
})

export const createEmployeeSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(1).max(200),
  phone: phoneField,
  email: z.string().email().optional(),
  document: z.string().min(1).max(50).optional(),
})

export const updateEmployeeSchema = z.object({
  departmentId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  phone: phoneField.optional(),
  email: z.string().email().nullable().optional(),
  document: z.string().min(1).max(50).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export const importRowSchema = z.object({
  name: z.string().min(1),
  phone: phoneField,
  departmentName: z.string().min(1),
  email: z.string().email().optional(),
})
