"use server"

import { redirect } from "next/navigation"
import { getSession } from "@/modules/auth/session"
import { getDeptHealthSummary, type DeptHealthSummary } from "@/modules/dashboard/dashboard.service"

interface GetDeptHealthSummaryResult {
  error?: string
  data?: DeptHealthSummary
}

export async function getDeptHealthSummaryAction(deptId: string): Promise<GetDeptHealthSummaryResult> {
  const session = await getSession()
  if (!session) redirect("/login")

  const data = await getDeptHealthSummary(session.tenantId, deptId)
  return { data }
}
