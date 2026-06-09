import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let _client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (!_client) {
    _client = globalForPrisma.prisma || new PrismaClient();
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
