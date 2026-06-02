"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getDeptHealthSummary, type DeptHealthSummary } from "@/modules/dashboard/dashboard.service"

interface GetDeptHealthSummaryResult {
  error?: string
  data?: DeptHealthSummary
}

const deptIdSchema = z.string().uuid()

export async function getDeptHealthSummaryAction(deptId: string): Promise<GetDeptHealthSummaryResult> {
  const session = await getSession()
  if (!session) redirect("/login")

  const parsed = deptIdSchema.safeParse(deptId)
  if (!parsed.success) return { error: "ID inválido." }

  const data = await getDeptHealthSummary(session.tenantId, parsed.data)
  return { data }
}
