"use server"

import { logout } from "@/modules/auth/auth.service"

export async function logoutAction(): Promise<void> {
  await logout()
}
