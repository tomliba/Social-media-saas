-- Add user-editable profile fields. Both nullable → backward-compatible, no
-- backfill, safe to run against the live table. username is intentionally NOT
-- unique (product decision); country stores an ISO 3166-1 alpha-2 code.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "country" TEXT;
