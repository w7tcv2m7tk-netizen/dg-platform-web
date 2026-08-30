-- ============================================================================
-- btree_gist capability check — READ ONLY, does not install anything.
--
-- Answers whether a database-level booking overlap constraint is even possible
-- on Neon before anyone commits to it. It does NOT create the extension and does
-- NOT create the constraint.
--
--     Application-level advisory locking remains the approved and active
--     protection until these questions are answered.
--
-- Run against STAGING first. Sections 1-6 are pure SELECTs and safe against
-- production. Section 7 is the only part that would write, is commented out,
-- and must not be run without an explicit decision.
--
--     psql "$STAGING_DATABASE_URL" -f docs/infrastructure/BTREE-GIST-CAPABILITY-CHECK.sql
--
-- Context: packages/database/prisma/baseline/proposed/stay_booking_no_overlap.sql
-- holds the proposed constraint. It is unapplied and unreferenced by code.
-- ============================================================================

\echo '== 0. Where are we? Confirm before reading anything else. =='

SELECT
  current_database()  AS database,
  current_user        AS role,
  version()           AS server_version,
  inet_server_addr()  AS server_addr;

\echo '== 1. Is btree_gist available to install? =='
-- Neon ships a fixed extension allowlist. Absent here means not possible at all,
-- and the question ends.

SELECT name, default_version, installed_version, comment
FROM pg_available_extensions
WHERE name IN ('btree_gist', 'btree_gin')
ORDER BY name;

\echo '== 2. Is it already installed? =='

SELECT extname, extversion, nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname = 'btree_gist';

\echo '== 3. Can this role create an extension? =='
-- CREATE EXTENSION needs database-level CREATE, and on Neon typically a
-- superuser-equivalent or the neon_superuser role.

SELECT
  current_user AS role,
  pg_has_role(current_user, 'neon_superuser', 'member') AS in_neon_superuser,
  has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_in_db,
  (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_superuser;

\echo '== 4. Would the constraint be satisfiable? Existing overlaps. =='
-- An exclusion constraint is rejected outright if current data violates it.
-- Half-open interval semantics: [checkin, checkout), matching the application.
--
-- Scoped per unit, excluding cancelled stays, mirroring
-- NON_BLOCKING_STAY_STATUSES in booking-conflicts.ts.

SELECT COUNT(*) AS overlapping_pairs
FROM stay_bookings a
JOIN stay_bookings b
  ON a.organisation_id = b.organisation_id
 AND a.accommodation_unit_id = b.accommodation_unit_id
 AND a.id < b.id
 AND a.checkin < b.checkout
 AND b.checkin < a.checkout
WHERE a.accommodation_unit_id IS NOT NULL
  AND a.checkin IS NOT NULL AND a.checkout IS NOT NULL
  AND b.checkin IS NOT NULL AND b.checkout IS NOT NULL
  AND a.status NOT IN ('cancelled', 'canceled')
  AND b.status NOT IN ('cancelled', 'canceled');

\echo '== 4b. The offending pairs, if any =='
-- Every row here must be resolved by hand before a constraint can be added.
-- These are real double-bookings, so they are worth seeing regardless.

SELECT
  a.organisation_id,
  a.accommodation_unit_id,
  a.id AS booking_a, a.guest_name AS guest_a, a.checkin AS in_a, a.checkout AS out_a, a.status AS status_a,
  b.id AS booking_b, b.guest_name AS guest_b, b.checkin AS in_b, b.checkout AS out_b, b.status AS status_b
FROM stay_bookings a
JOIN stay_bookings b
  ON a.organisation_id = b.organisation_id
 AND a.accommodation_unit_id = b.accommodation_unit_id
 AND a.id < b.id
 AND a.checkin < b.checkout
 AND b.checkin < a.checkout
WHERE a.accommodation_unit_id IS NOT NULL
  AND a.checkin IS NOT NULL AND a.checkout IS NOT NULL
  AND b.checkin IS NOT NULL AND b.checkout IS NOT NULL
  AND a.status NOT IN ('cancelled', 'canceled')
  AND b.status NOT IN ('cancelled', 'canceled')
ORDER BY a.organisation_id, a.accommodation_unit_id, a.checkin
LIMIT 100;

\echo '== 5. How much data would a constraint have to validate? =='

SELECT
  COUNT(*) AS stay_bookings_total,
  COUNT(*) FILTER (WHERE accommodation_unit_id IS NULL) AS without_unit,
  COUNT(*) FILTER (WHERE checkin IS NULL OR checkout IS NULL) AS without_dates,
  COUNT(*) FILTER (WHERE status IN ('cancelled', 'canceled')) AS cancelled,
  COUNT(DISTINCT accommodation_unit_id) AS distinct_units
FROM stay_bookings;

\echo '== 6. Rows the constraint could not cover =='
-- A unit-scoped exclusion constraint cannot police rows with no unit. These are
-- the rows the importer now marks `overlap_unchecked`, so a constraint would
-- NOT make application-level checking redundant.

SELECT COUNT(*) AS unconstrainable_rows
FROM stay_bookings
WHERE accommodation_unit_id IS NULL
   OR checkin IS NULL
   OR checkout IS NULL;

-- ============================================================================
-- 7. WRITE STEPS — DO NOT RUN without an explicit decision.
--
-- Left commented deliberately. Enabling the extension and adding the constraint
-- is a schema change requiring the same review-approve-apply-verify sequence as
-- any other, and it is blocked on the operator-override question below.
--
--   CREATE EXTENSION IF NOT EXISTS btree_gist;
--
--   -- Then the constraint from
--   -- packages/database/prisma/baseline/proposed/stay_booking_no_overlap.sql
--
-- THE UNRESOLVED QUESTION: operator override.
--
-- `updateStayBooking` accepts `force`, and the plugin's create path accepts
-- `force` / `allow_overlap`, both of which deliberately permit an overlapping
-- write. A database exclusion constraint has no notion of intent: it would
-- reject those writes with SQLSTATE 23P01 regardless of the operator's decision.
--
-- So before this can be applied, someone has to decide whether operator
-- overrides survive at all. If they must, the constraint needs to be deferrable
-- and explicitly relaxed for those transactions, which is materially more
-- complex than the advisory lock already in place — and the write paths must
-- translate 23P01 into a usable error first.
--
-- Until that is settled, the advisory lock in
-- packages/platform-core/src/accommodation/booking-conflicts.ts remains the
-- approved protection. It also covers the no-unit rows in section 6, which a
-- constraint cannot.
-- ============================================================================
