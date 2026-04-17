import { z } from "zod"

export const acceptConsentSchema = z.object({
  token: z.string().min(1, "Token inválido"),
  cpf: z
    .string()
    .min(11, "CPF inválido")
    .max(14, "CPF inválido")
    .transform((v) => v.replace(/\D/g, "")),
})

export const optOutConsentSchema = z.object({
  token: z.string().min(1, "Token inválido"),
})

export type AcceptConsentInput = z.infer<typeof acceptConsentSchema>
export type OptOutConsentInput = z.infer<typeof optOutConsentSchema>
