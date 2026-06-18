-- AlterTable: add nullable moderation timestamp (additive, safe to deploy live)
ALTER TABLE "User" ADD COLUMN "bannedAt" TIMESTAMP(3);

-- CreateTable: append-only Lemon Squeezy webhook delivery log
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "resourceId" TEXT,
    "userId" TEXT,
    "rawPayload" JSONB NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "grantedCreditTxId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_eventName_idx" ON "WebhookEvent"("eventName");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");
