import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    // During build time without DATABASE_URL, create a client that will fail at runtime
    // This is acceptable for CI/build environments
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: 'postgresql://placeholder/placeholder' }),
      log: ['error'],
    })
  }

  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter, log: ['error'] })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
