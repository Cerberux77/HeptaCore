import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config();

export default defineConfig({
  schema: "packages/db/prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL!
  },
  migrations: {
    path: "packages/db/prisma/migrations"
  }
});
