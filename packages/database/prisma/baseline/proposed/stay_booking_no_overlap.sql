-- ============================================================================
-- PROPOSED — NOT APPLIED. Do not run against production.
--
-- H-9 defence in depth: make overlapping active bookings for the same
-- accommodation unit impossible at the database level, so the invariant holds
-- even for a write path that forgets to check.
--
-- Application-level protection (advisory lock + overlap query in
-- packages/platform-core/src/accommodation/booking-conflicts.ts) is already in
-- place and does not depend on this. This is the final integrity boundary.
--
-- REQUIRES btree_gist. Verify on staging before considering production:
--   SELECT * FROM pg_available_extensions WHERE name = 'btree_gist';
--   CREATE EXTENSION IF NOT EXISTS btree_gist;   -- staging only
-- Neon supports the standard contrib extensions, but the repository contains
-- no evidence of which extensions this project's Neon plan permits, and no
-- extension is currently enabled anywhere in the schema or migrations. Treat
-- availability as unconfirmed until checked.
-- ============================================================================

-- 1. Extension. Requires sufficient privileges on the target database.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Pre-flight: existing violations must be resolved first, or the constraint
--    creation will fail. Run this and expect zero rows before continuing.
--
--    SELECT a.id, b.id, a.accommodation_unit_id, a.checkin, a.checkout
--    FROM stay_bookings a
--    JOIN stay_bookings b
--      ON a.id < b.id
--     AND a.organisation_id = b.organisation_id
--     AND a.accommodation_unit_id = b.accommodation_unit_id
--     AND a.status NOT IN ('cancelled','canceled')
--     AND b.status NOT IN ('cancelled','canceled')
--     AND a.checkin < b.checkout
--     AND a.checkout > b.checkin
--    WHERE a.accommodation_unit_id IS NOT NULL
--      AND a.checkin IS NOT NULL AND a.checkout IS NOT NULL
--      AND b.checkin IS NOT NULL AND b.checkout IS NOT NULL;

-- 3. The constraint.
--
--    Half-open range '[)' matches the application semantics exactly: a booking
--    checking out on the 10th does not conflict with one checking in on the
--    10th, so same-day turnover stays legal.
--
--    Scoped by organisation_id AND accommodation_unit_id so tenants and units
--    never contend. Partial WHERE clause excludes cancelled stays and rows
--    with no unit or no dates, mirroring findOverlappingBookings().
--
--    NOT VALID lets the constraint apply to new writes immediately without
--    scanning the whole table under lock; VALIDATE separately once clean.
ALTER TABLE "stay_bookings"
  ADD CONSTRAINT "stay_bookings_no_overlap"
  EXCLUDE USING gist (
    "organisation_id" WITH =,
    "accommodation_unit_id" WITH =,
    tsrange("checkin", "checkout", '[)') WITH &&
  )
  WHERE (
    "status" NOT IN ('cancelled', 'canceled')
    AND "accommodation_unit_id" IS NOT NULL
    AND "checkin" IS NOT NULL
    AND "checkout" IS NOT NULL
  )
  NOT VALID;

-- 4. Validate once step 2 returns no rows. Takes a SHARE UPDATE EXCLUSIVE lock;
--    concurrent reads and writes continue.
-- ALTER TABLE "stay_bookings" VALIDATE CONSTRAINT "stay_bookings_no_overlap";

-- ============================================================================
-- ROLLBACK
--   ALTER TABLE "stay_bookings" DROP CONSTRAINT IF EXISTS "stay_bookings_no_overlap";
--   -- Leave btree_gist installed; dropping it is unnecessary and may affect
--   -- other objects.
--
-- BEHAVIOURAL NOTE
--   Once active, a conflicting insert raises SQLSTATE 23P01 (exclusion
--   violation) instead of returning the application's "dates_unavailable"
--   result. The write paths must translate 23P01 into that same response
--   before this is enabled, otherwise a race surfaces to the caller as a 500.
--   That translation is deliberately NOT included in this pass, because
--   shipping it before the constraint exists would be dead code.
--
-- ADMIN OVERRIDE
--   The authenticated `force` / `allow_overlap` path would also be blocked by
--   this constraint. Decide before enabling whether operator overrides should
--   remain possible; if so, they need an explicit escape (for example writing
--   the override as a cancelled-then-replaced pair, or a dedicated status
--   excluded from the predicate).
-- ============================================================================
