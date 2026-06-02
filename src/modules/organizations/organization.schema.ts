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

export const setOrgTrialSchema = z.object({
  trialExpiresAt: z.string().date(),
})

export const createOrgByAdminSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres.").max(100),
  slug: z
    .string()
    .min(2, "Identificador deve ter pelo menos 2 caracteres.")
    .max(50, "Identificador deve ter no máximo 50 caracteres.")
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hifens."),
  adminEmail: z.string().email("E-mail inválido."),
  planId: z.string().uuid().optional(),
  timezone: z.string().optional(),
})
