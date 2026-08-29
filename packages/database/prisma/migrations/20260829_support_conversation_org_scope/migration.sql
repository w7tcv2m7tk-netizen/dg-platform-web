-- Support conversations are tenant-scoped: one thread per (clerk user, organisation).
-- Fixes cross-tenant leak where clerk_user_id alone was unique.

-- 1. Backfill missing organisation_id from the user's sole active membership
UPDATE "support_conversations" sc
SET "organisation_id" = m."organisation_id",
    "updated_at" = CURRENT_TIMESTAMP
FROM (
  SELECT "clerk_user_id", MIN("organisation_id") AS "organisation_id"
  FROM "memberships"
  WHERE "status" = 'active'
  GROUP BY "clerk_user_id"
  HAVING COUNT(DISTINCT "organisation_id") = 1
) m
WHERE sc."organisation_id" IS NULL
  AND sc."clerk_user_id" = m."clerk_user_id";

-- 2. Prefer DigitalGate-staff membership when still null and user has multiple orgs
--    (no automatic guess for customer multi-org — leave for repair script)

-- 3. Drop global unique on clerk_user_id
DROP INDEX IF EXISTS "support_conversations_clerk_user_id_key";

-- 4. Reject remaining nulls by attaching to first active membership (deterministic last resort)
UPDATE "support_conversations" sc
SET "organisation_id" = m."organisation_id",
    "updated_at" = CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON ("clerk_user_id")
    "clerk_user_id",
    "organisation_id"
  FROM "memberships"
  WHERE "status" = 'active'
  ORDER BY "clerk_user_id", "created_at" ASC
) m
WHERE sc."organisation_id" IS NULL
  AND sc."clerk_user_id" = m."clerk_user_id";

-- 5. Enforce NOT NULL + composite unique + org index
ALTER TABLE "support_conversations"
  ALTER COLUMN "organisation_id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "support_conversations_clerk_user_id_organisation_id_key"
  ON "support_conversations"("clerk_user_id", "organisation_id");

CREATE INDEX IF NOT EXISTS "support_conversations_organisation_id_last_message_at_idx"
  ON "support_conversations"("organisation_id", "last_message_at");
