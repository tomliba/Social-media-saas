-- The 'starter' tier was removed (Free / Creator / Pro only).
-- Move any legacy starter users to free. Idempotent: once no rows remain on
-- 'starter', re-running this affects zero rows.
UPDATE "User" SET "plan" = 'free' WHERE "plan" = 'starter';
