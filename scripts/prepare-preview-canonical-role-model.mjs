import pg from "pg";

const ALLOW = process.env.ALLOW_PREVIEW_SCHEMA_SYNC;
const VERCEL_ENV = process.env.VERCEL_ENV;
const DATABASE_URL = process.env.DATABASE_URL;
const EXPECTED_HOST = "ep-lively-lake-aq2uvkv4";

function abort(reason) {
  console.error("[ABORT] " + reason);
  process.exit(1);
}

if (ALLOW !== "1") abort("ALLOW_PREVIEW_SCHEMA_SYNC must be 1");
if (VERCEL_ENV !== "preview") abort("VERCEL_ENV must be preview");
if (!DATABASE_URL) abort("DATABASE_URL is required");
if (!DATABASE_URL.includes(EXPECTED_HOST)) abort("DATABASE_URL host mismatch");

const pool = new pg.Pool({ connectionString: DATABASE_URL });

try {
  console.log("[PREVIEW SCHEMA] Preparing canonical role model columns...");

  await pool.query(`
    DO $$
    BEGIN
      CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await pool.query(`
    ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "platformRole" "PlatformRole";
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "consumedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key"
    ON "PasswordResetToken"("tokenHash");
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
    ON "PasswordResetToken"("userId");
  `);

  await pool.query(`
    DO $$
    BEGIN
      ALTER TABLE "PasswordResetToken"
      ADD CONSTRAINT "PasswordResetToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  console.log("[PREVIEW SCHEMA] Canonical role model schema is ready for QA seed.");
} catch (error) {
  console.error("[PREVIEW SCHEMA] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await pool.end();
}
