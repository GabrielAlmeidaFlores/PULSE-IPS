import { z } from "zod"

export const loginSchema = z.object({
  orgSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export const superAdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  orgSlug: z.string().min(1),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})
