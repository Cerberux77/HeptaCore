-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('PILOT', 'GROWTH', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'STRATEGIST', 'EDITOR', 'ANALYST', 'APPROVER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SocialNetwork" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'X');

-- CreateEnum
CREATE TYPE "AutomationMode" AS ENUM ('DRAFT_ONLY', 'APPROVAL_REQUIRED', 'AUTOPILOT_LIMITED', 'AUTOPILOT_FULL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOGO', 'BRAND_REFERENCE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PROPOSED', 'NEEDS_APPROVAL', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'PILOT',
    "automationMode" "AutomationMode" NOT NULL DEFAULT 'DRAFT_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "offer" TEXT,
    "audience" JSONB,
    "valueProps" JSONB,
    "constraints" JSONB,
    "strategyBrief" JSONB,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "kind" "AssetKind" NOT NULL,
    "sourcePath" TEXT,
    "storageKey" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "metadata" JSONB,
    "rightsStatus" TEXT NOT NULL DEFAULT 'needs_review',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "network" "SocialNetwork" NOT NULL,
    "handle" TEXT,
    "externalAccountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialVaultItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "encryptedBlob" BYTEA NOT NULL,
    "keyVersion" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialVaultItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "socialAccountId" TEXT,
    "network" "SocialNetwork" NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT[],
    "cta" TEXT,
    "pillar" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalPostId" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraftAsset" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'primary',

    CONSTRAINT "ContentDraftAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "draftId" TEXT,
    "reviewerId" TEXT,
    "status" "ApprovalStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "network" "SocialNetwork" NOT NULL,
    "externalId" TEXT,
    "authorHandle" TEXT,
    "body" TEXT NOT NULL,
    "sentiment" TEXT,
    "topic" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "responseDraft" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "network" "SocialNetwork" NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "platformBudget" DECIMAL(12,2) NOT NULL,
    "overheadRate" DECIMAL(4,2) NOT NULL DEFAULT 0.35,
    "totalCharge" DECIMAL(12,2) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PROPOSED',
    "recommendation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "name" TEXT,
    "contact" TEXT,
    "company" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "consent" TEXT NOT NULL DEFAULT 'unknown',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "draftId" TEXT,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sentTo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_tenantId_role_idx" ON "Membership"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");

-- CreateIndex
CREATE INDEX "Asset_tenantId_kind_idx" ON "Asset"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");

-- CreateIndex
CREATE INDEX "SocialAccount_tenantId_network_idx" ON "SocialAccount"("tenantId", "network");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_tenantId_network_externalAccountId_key" ON "SocialAccount"("tenantId", "network", "externalAccountId");

-- CreateIndex
CREATE INDEX "CredentialVaultItem_tenantId_provider_idx" ON "CredentialVaultItem"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "ContentDraft_tenantId_network_status_idx" ON "ContentDraft"("tenantId", "network", "status");

-- CreateIndex
CREATE INDEX "ContentDraft_tenantId_scheduledFor_idx" ON "ContentDraft"("tenantId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "ContentDraftAsset_draftId_assetId_role_key" ON "ContentDraftAsset"("draftId", "assetId", "role");

-- CreateIndex
CREATE INDEX "Approval_tenantId_status_idx" ON "Approval"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Interaction_tenantId_network_status_idx" ON "Interaction"("tenantId", "network", "status");

-- CreateIndex
CREATE INDEX "Campaign_tenantId_status_idx" ON "Campaign"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Lead_tenantId_source_idx" ON "Lead"("tenantId", "source");

-- CreateIndex
CREATE INDEX "MetricSnapshot_draftId_capturedAt_idx" ON "MetricSnapshot"("draftId", "capturedAt");

-- CreateIndex
CREATE INDEX "Report_tenantId_type_period_idx" ON "Report"("tenantId", "type", "period");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialVaultItem" ADD CONSTRAINT "CredentialVaultItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraftAsset" ADD CONSTRAINT "ContentDraftAsset_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraftAsset" ADD CONSTRAINT "ContentDraftAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
