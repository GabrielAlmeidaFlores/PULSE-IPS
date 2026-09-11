import { prisma } from "@/libs/db"

export interface CreateClimateSurveyActionSuggestionInput {
  dispatchId: string
  dimension: string
  what: string
  why: string
  who: string
  where: string
  when: string
  how: string
}

export interface ClimateSurveyActionSuggestionRow {
  id: string
  dispatchId: string
  dimension: string
  what: string
  why: string
  who: string
  where: string
  when: string
  how: string
  cost: string | null
  status: string
  rejectedReason: string | null
  actionPlanId: string | null
  createdAt: Date
}

export async function findClimateSurveyActionSuggestionDimensions(
  tenantId: string,
  dispatchId: string,
): Promise<string[]> {
  const rows = await prisma.climateSurveyActionSuggestion.findMany({
    where: { tenantId, dispatchId },
    select: { dimension: true },
  })
  return rows.map((row) => row.dimension)
}

export async function createClimateSurveyActionSuggestions(
  tenantId: string,
  inputs: CreateClimateSurveyActionSuggestionInput[],
): Promise<void> {
  if (inputs.length === 0) return
  await prisma.climateSurveyActionSuggestion.createMany({
    data: inputs.map((input) => ({ ...input, tenantId })),
  })
}

export function findPendingClimateSurveyActionSuggestions(
  tenantId: string,
): Promise<ClimateSurveyActionSuggestionRow[]> {
  return prisma.climateSurveyActionSuggestion.findMany({
    where: { tenantId, status: "pending" },
    orderBy: { createdAt: "desc" },
  })
}

export function findClimateSurveyActionSuggestionById(
  tenantId: string,
  id: string,
): Promise<ClimateSurveyActionSuggestionRow | null> {
  return prisma.climateSurveyActionSuggestion.findFirst({ where: { id, tenantId } })
}

export interface ClimateSurveyActionSuggestionFields {
  what: string
  why: string
  who: string
  where: string
  when: string
  how: string
  cost: string | null
}

export async function markClimateSurveyActionSuggestionAccepted(
  tenantId: string,
  id: string,
  actionPlanId: string,
  fields: ClimateSurveyActionSuggestionFields,
): Promise<void> {
  await prisma.climateSurveyActionSuggestion.updateMany({
    where: { id, tenantId, status: "pending" },
    data: { ...fields, status: "accepted", actionPlanId },
  })
}

export async function markClimateSurveyActionSuggestionRejected(
  tenantId: string,
  id: string,
  reason: string,
): Promise<void> {
  await prisma.climateSurveyActionSuggestion.updateMany({
    where: { id, tenantId, status: "pending" },
    data: { status: "rejected", rejectedReason: reason },
  })
}
