import { z } from "zod"

export const loginSchema = z.object({
  orgSlug: z.string().min(1, { message: "Informe o slug da organização." }),
  email: z.string().email({ message: "E-mail inválido." }),
  password: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres." }),
})

export const superAdminLoginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
  password: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres." }),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Informe a senha atual." }),
  newPassword: z.string().min(8, { message: "A nova senha deve ter no mínimo 8 caracteres." }),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
  orgSlug: z.string().min(1, { message: "Informe o slug da organização." }),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Token inválido." }),
  newPassword: z.string().min(8, { message: "A nova senha deve ter no mínimo 8 caracteres." }),
})
