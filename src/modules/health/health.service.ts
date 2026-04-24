import { healthRepository } from "@/modules/health/health.repository"

export const healthService = {
  checkDatabase: async (): Promise<boolean> => {
    try {
      await healthRepository.ping()
      return true
    } catch {
      return false
    }
  },
}
