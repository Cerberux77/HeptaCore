import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config();

// Prefer DIRECT_URL (unpooled) for schema/migration operations, but fall back to
// DATABASE_URL when DIRECT_URL is not provided (e.g. Vercel Preview). Never log
// the resolved value: it contains credentials.
const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "packages/db/prisma/schema.prisma",
  datasource: {
    url: datasourceUrl
  },
  migrations: {
    path: "packages/db/prisma/migrations"
  }
});
