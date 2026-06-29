-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "status"      "TenantStatus" NOT NULL DEFAULT 'PROVISIONING',
ADD COLUMN     "timezone"    TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "locale"      TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "archivedAt"  TIMESTAMP(3);

-- Set existing tenants to ACTIVE (they were created before lifecycle was introduced)
UPDATE "Tenant" SET "status" = 'ACTIVE';
