import { PrismaClient } from "@prisma/client";

// Reuse the client across Next.js dev-server hot reloads instead of opening
// a fresh Postgres connection pool on every module reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
