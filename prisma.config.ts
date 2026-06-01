import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "packages/db/prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL")
  },
  migrations: {
    path: "packages/db/prisma/migrations"
  }
});
