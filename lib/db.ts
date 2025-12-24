/**
 * Prisma Client Singleton
 * 
 * Prevents multiple instances of Prisma Client in development
 * due to hot-reloading in Next.js.
 * 
 * Usage:
 *   import { db } from '@/lib/db'
 *   const users = await db.user.findMany()
 */

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

