import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForWorker = globalThis as unknown as { prisma: PrismaClient };

function makePrisma() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForWorker.prisma || makePrisma();

if (process.env.NODE_ENV !== "production") globalForWorker.prisma = prisma;
