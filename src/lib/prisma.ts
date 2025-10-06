// PATH: src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient singleton
 *  - In development: één globale instance (hot reload safe)
 *  - In production: altijd nieuwe instance per import
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
