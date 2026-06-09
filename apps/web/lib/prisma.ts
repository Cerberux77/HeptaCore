import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: pg.Pool | undefined;
};

let _client: PrismaClient | undefined;

function makeClient(): PrismaClient {
  const pool = globalForPrisma.prismaPool || new pg.Pool({ connectionString: process.env.DATABASE_URL });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prismaPool = pool;
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function getClient(): PrismaClient {
  if (!_client) {
    _client = globalForPrisma.prisma || makeClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _client;
  }
  return _client;
}

const _proxy = new Proxy({} as PrismaClient, {
  get(_target: object, prop: string | symbol) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") return (value as Function).bind(client);
    return value;
  },
});

export const prisma = _proxy as unknown as PrismaClient;
