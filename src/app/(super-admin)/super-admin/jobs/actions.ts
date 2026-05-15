"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSuperAdminSession } from "@/modules/auth/session"
import { createJobQueueReader, createMessageQueueReader } from "@/libs/queue"
import type { ActionResult } from "@/libs/utils/action-result"

export async function retryAllFailedJobsAction(): Promise<ActionResult> {
  const session = await getSuperAdminSession()
  if (session === null) redirect("/super-admin/login")

  const jobQueue = createJobQueueReader()
  const messageQueue = createMessageQueueReader()

  try {
    await Promise.all([
      jobQueue.retryJobs({ state: "failed" }),
      messageQueue.retryJobs({ state: "failed" }),
    ])
  } finally {
    await Promise.all([jobQueue.close(), messageQueue.close()])
  }

  revalidatePath("/super-admin/jobs")
  return {}
}
