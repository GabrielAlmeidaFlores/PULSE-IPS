import { z } from "zod"
import { normalizePhoneToE164 } from "@/libs/utils/phone"

const phoneField = z.string().min(1, { message: "Informe o número de telefone." }).transform((val, ctx) => {
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
  departmentId: z.string().uuid({ message: "Setor inválido." }),
  name: z.string().min(1, { message: "Informe o nome do colaborador." }).max(200),
  phone: phoneField,
  email: z.string().email({ message: "E-mail inválido." }).optional(),
  document: z.string().min(1).max(50).optional(),
})

export const updateEmployeeSchema = z.object({
  departmentId: z.string().uuid({ message: "Setor inválido." }).optional(),
  name: z.string().min(1, { message: "Informe o nome do colaborador." }).max(200).optional(),
  phone: phoneField.optional(),
  email: z.string().email({ message: "E-mail inválido." }).nullable().optional(),
  document: z.string().min(1).max(50).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export const importRowSchema = z.object({
  name: z.string().min(1, { message: "Informe o nome." }),
  phone: phoneField,
  departmentName: z.string().min(1, { message: "Informe o setor." }),
  email: z.string().email({ message: "E-mail inválido." }).optional(),
})
