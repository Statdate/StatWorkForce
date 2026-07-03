import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // The local `prisma dev` database (PGlite behind a TCP proxy) corrupts
    // prepared statements when queries multiplex across pooled connections
    // ("bind message supplies N parameters..." / "prepared statement already
    // exists"). A single connection serializes local traffic and avoids it;
    // production Postgres keeps the default pool.
    max: process.env.NODE_ENV === "production" ? undefined : 1,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
