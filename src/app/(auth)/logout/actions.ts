"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { logout } from "@/modules/auth/auth.service"

export async function logoutAction(): Promise<void> {
  try {
    await logout()
    redirect("/login")
  } catch (error) {
    if (isRedirectError(error)) throw error
    throw error
  }
}
