"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { superAdminLogout } from "@/modules/auth/auth.service"

export async function superAdminLogoutAction(): Promise<void> {
  try {
    await superAdminLogout()
    redirect("/super-admin/login")
  } catch (error) {
    if (isRedirectError(error)) throw error
  }
}
