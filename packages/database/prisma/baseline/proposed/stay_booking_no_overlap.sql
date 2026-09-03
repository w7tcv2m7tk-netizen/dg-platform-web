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
--    NOTE: PostgreSQL exclusion constraints do not support NOT VALID. Treat
--    creation as a controlled migration after the pre-flight query is clean.
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
  );

-- 4. Validate by attempting the controlled creation above after the pre-flight
--    query returns zero rows. No separate VALIDATE command is required because
--    EXCLUDE constraints cannot be marked NOT VALID.

-- ============================================================================
-- ROLLBACK
--   ALTER TABLE "stay_bookings" DROP CONSTRAINT IF EXISTS "stay_bookings_no_overlap";
--   -- Leave btree_gist installed; dropping it is unnecessary and may affect
--   -- other objects.
--
-- BEHAVIOURAL NOTE
--   Once active, a conflicting insert raises SQLSTATE 23P01 (exclusion
--   violation). The write paths must translate that into the normal
--   dates_unavailable response before enabling this boundary, otherwise a race
--   can surface as a 500.
--
-- ADMIN OVERRIDE
--   The authenticated `force` path is intentionally unresolved for this
--   proposed database boundary. Decide before enabling whether operator
--   overrides should remain possible.
-- ============================================================================