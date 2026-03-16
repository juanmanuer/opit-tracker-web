import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig, Pool } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

declare global {
  var prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  const pool = new Pool({ connectionString } as any)
  const adapter = new PrismaNeon(pool as any)
  return new PrismaClient({ adapter } as any)
}

export const prisma = global.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") global.prisma = prisma