/*
  Warnings:

  - You are about to drop the column `autopilotEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `postsLimit` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `postsUsed` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `usageResetAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `videosLimit` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `videosUsed` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "autopilotEnabled",
DROP COLUMN "postsLimit",
DROP COLUMN "postsUsed",
DROP COLUMN "usageResetAt",
DROP COLUMN "videosLimit",
DROP COLUMN "videosUsed",
ADD COLUMN     "creditBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT;

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "jobId" TEXT,
    "externalEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_jobId_type_key" ON "CreditTransaction"("jobId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_externalEventId_key" ON "CreditTransaction"("externalEventId");

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
