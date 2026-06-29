ALTER TABLE "PublishingJob" ADD COLUMN "claimedAt" TIMESTAMP(3);
ALTER TABLE "PublishingJob" ADD COLUMN "claimToken" TEXT;
ALTER TABLE "PublishingJob" ADD COLUMN "providerAttemptStartedAt" TIMESTAMP(3);

CREATE INDEX "PublishingJob_status_scheduledFor_idx" ON "PublishingJob"("status", "scheduledFor");
CREATE INDEX "PublishingJob_status_claimedAt_idx" ON "PublishingJob"("status", "claimedAt");
