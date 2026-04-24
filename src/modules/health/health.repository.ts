import { prisma } from "@/libs/db"

export const healthRepository = {
  ping: async (): Promise<void> => {
    await prisma.superAdmin.count()
  },
}
