import { z } from "zod"

export const dataExtractionRowSchema = z.object({
  employeeName: z.string().trim().min(1),
  document: z.string().trim().min(1).optional(),
  registration: z.string().trim().min(1).optional(),
  departmentName: z.string().trim().min(1).optional(),
  roleName: z.string().trim().min(1).optional(),
  admissionDate: z.string().trim().min(1).optional(),
  terminationDate: z.string().trim().min(1).optional(),
  expectedHours: z.number().optional(),
  workedHours: z.number().optional(),
  justifiedAbsenceHours: z.number().optional(),
  unjustifiedAbsenceHours: z.number().optional(),
  absenceRatePercent: z.number().optional(),
  terminationType: z.string().trim().min(1).optional(),
})

export const dataCorrectionFieldSchema = z.enum([
  "employeeName",
  "document",
  "registration",
  "departmentName",
  "roleName",
  "admissionDate",
  "terminationDate",
  "expectedHours",
  "workedHours",
  "justifiedAbsenceHours",
  "unjustifiedAbsenceHours",
  "absenceRatePercent",
  "terminationType",
])

export const dataCorrectionSchema = z.object({
  rowKey: z.string().trim().min(1),
  field: dataCorrectionFieldSchema,
  value: z.string().trim().min(1),
  reason: z.string().trim().min(1).optional(),
})

export const dataCorrectionsToolSchema = z.object({
  corrections: z.array(dataCorrectionSchema).min(1),
})

export const dataExtractionErrorToolSchema = z.object({
  description: z.string().trim().min(1),
})

export type DataExtractionRowArgs = z.infer<typeof dataExtractionRowSchema>
export type DataCorrectionArgs = z.infer<typeof dataCorrectionSchema>
