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

const TIME_REGEX = /^\d{2}:\d{2}$/
const INVALID_TIME_MESSAGE = "Formato de horário inválido (HH:MM)."

export const updateEmployeeSchema = z.object({
  departmentId: z.string().uuid({ message: "Setor inválido." }).optional(),
  name: z.string().min(1, { message: "Informe o nome do colaborador." }).max(200).optional(),
  phone: phoneField.optional(),
  email: z.string().email({ message: "E-mail inválido." }).nullable().optional(),
  document: z.string().min(1).max(50).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  workStartTime: z.string().nullable().optional().transform((v) => (v === null || v === undefined || v === "") ? null : v).refine((v) => v === null || TIME_REGEX.test(v), INVALID_TIME_MESSAGE),
  workEndTime: z.string().nullable().optional().transform((v) => (v === null || v === undefined || v === "") ? null : v).refine((v) => v === null || TIME_REGEX.test(v), INVALID_TIME_MESSAGE),
  workDays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
})

export const importRowSchema = z.object({
  name: z.string().min(1, { message: "Informe o nome." }),
  phone: phoneField,
  departmentName: z.string().min(1, { message: "Informe o setor." }),
  email: z.string().email({ message: "E-mail inválido." }).optional(),
  workStartTime: z.string().regex(TIME_REGEX, INVALID_TIME_MESSAGE).optional(),
  workEndTime: z.string().regex(TIME_REGEX, INVALID_TIME_MESSAGE).optional(),
  workDays: z.array(z.number().int().min(0).max(6)).optional(),
})
