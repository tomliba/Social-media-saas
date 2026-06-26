CREATE TABLE "SignupEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ip" TEXT,
    "country" TEXT,
    "asn" TEXT,
    "asnOrg" TEXT,
    "isDatacenter" BOOLEAN,
    "isProxy" BOOLEAN,
    "turnstilePassed" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT NOT NULL,
    CONSTRAINT "SignupEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SignupEvent_ip_idx" ON "SignupEvent"("ip");
CREATE INDEX "SignupEvent_emailDomain_idx" ON "SignupEvent"("emailDomain");
CREATE INDEX "SignupEvent_createdAt_idx" ON "SignupEvent"("createdAt");
