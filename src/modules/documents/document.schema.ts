import { z } from "zod"

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["policy", "procedure", "pgr", "pcmso", "other"]),
  fileUrl: z.string().url().optional(),
})

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
})
