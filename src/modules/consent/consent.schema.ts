import { z } from "zod"

export const acceptConsentSchema = z.object({
  token: z.string().min(1, "Token inválido"),
  document: z
    .string()
    .optional(),
})

export const optOutConsentSchema = z.object({
  token: z.string().min(1, "Token inválido"),
})

export type AcceptConsentInput = z.infer<typeof acceptConsentSchema>
export type OptOutConsentInput = z.infer<typeof optOutConsentSchema>
