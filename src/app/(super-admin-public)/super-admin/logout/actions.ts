"use server"

import { superAdminLogout } from "@/modules/auth/auth.service"

export async function superAdminLogoutAction(): Promise<void> {
  await superAdminLogout()
}
