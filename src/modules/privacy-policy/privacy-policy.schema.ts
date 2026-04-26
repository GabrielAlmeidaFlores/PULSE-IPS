import { z } from "zod"

export const createPrivacyPolicyVersionSchema = z.object({
  version: z.string().min(1).max(20).trim(),
  title: z.string().min(1).max(255).trim(),
  content: z.string().min(1).max(500000),
  effectiveAt: z.string().date(),
})
