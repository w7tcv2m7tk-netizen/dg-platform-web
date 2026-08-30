-- ============================================================================
-- Production subscription audit — READ ONLY.
--
-- Establishes why organisations exist without a PlatformSubscription row,
-- before any decision is taken about the entitlement rule. The current rule is
-- unchanged and stays unchanged until these numbers are reviewed:
--
--     no PlatformSubscription row  ->  FULL entitlement
--
-- Every statement is a SELECT. Nothing writes, locks or alters. Safe against
-- production.
--
--     psql "$DATABASE_URL" -f docs/infrastructure/SUBSCRIPTION-AUDIT.sql
--
-- Add -A -F$'\t' for tab-separated output to paste into a sheet.
--
-- Column names are the SQL ones (snake_case @map), checked against
-- packages/database/prisma/baseline/0_init.sql. Note `organisations` has NO
-- deleted_at column — it uses `status` instead — while contacts, properties and
-- org_communications are soft-deleted.
-- ============================================================================

\echo '== 1. Totals =='

SELECT
  (SELECT COUNT(*) FROM organisations) AS organisations_total,
  (SELECT COUNT(DISTINCT organisation_id) FROM platform_subscriptions) AS with_subscription_row,
  (
    SELECT COUNT(*)
    FROM organisations o
    WHERE NOT EXISTS (
      SELECT 1 FROM platform_subscriptions ps WHERE ps.organisation_id = o.id
    )
  ) AS without_subscription_row;

\echo '== 2. Organisations by status (all organisations) =='
-- `status` defaults to 'trial'. This is the platform's own lifecycle marker and
-- is the most direct evidence of what an organisation is meant to be.

SELECT
  o.status,
  COUNT(*) AS organisations,
  COUNT(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1 FROM platform_subscriptions ps WHERE ps.organisation_id = o.id
    )
  ) AS of_which_rowless
FROM organisations o
GROUP BY o.status
ORDER BY organisations DESC;

\echo '== 3. Existing subscription rows by status and entitlement =='
-- Context for the rows that do exist, and confirmation that the entitlement
-- column is being populated as expected.

SELECT status, entitlement, COUNT(*) AS rows
FROM platform_subscriptions
GROUP BY status, entitlement
ORDER BY rows DESC;

\echo '== 4. Rowless organisations — age spread =='

SELECT
  MIN(created_at) AS oldest_rowless,
  MAX(created_at) AS newest_rowless,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')  AS created_last_7d,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS created_last_30d,
  COUNT(*) FILTER (WHERE created_at <  now() - interval '90 days') AS older_than_90d
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM platform_subscriptions ps WHERE ps.organisation_id = o.id
);

\echo '== 5. Rowless organisations by month created =='

SELECT
  date_trunc('month', created_at)::date AS month,
  COUNT(*) AS organisations
FROM organisations o
WHERE NOT EXISTS (
  SELECT 1 FROM platform_subscriptions ps WHERE ps.organisation_id = o.id
)
GROUP BY 1
ORDER BY 1;

\echo '== 6. Per-organisation evidence (the main table) =='
-- One row per rowless organisation, with everything needed to explain why it
-- exists. Read this before trusting the buckets in section 7.

WITH rowless AS (
  SELECT o.id, o.name, o.slug, o.status, o.industry,
         o.created_at, o.settings, o.billing_customer_id,
         o.stripe_connect_account_id
  FROM organisations o
  WHERE NOT EXISTS (
    SELECT 1 FROM platform_subscriptions ps WHERE ps.organisation_id = o.id
  )
)
SELECT
  r.id,
  r.name,
  r.slug,
  r.status,
  r.industry,
  r.created_at::date AS created,
  (now()::date - r.created_at::date) AS age_days,

  -- Billing evidence held outside PlatformSubscription.
  (r.billing_customer_id IS NOT NULL)                   AS has_billing_customer_id,
  (r.stripe_connect_account_id IS NOT NULL)             AS has_connect_account,
  (r.settings ? 'billing')                              AS has_billing_settings,
  (r.settings #>> '{billing,stripeCustomerId}')          AS settings_stripe_customer,
  (r.settings #>> '{billing,tier}')                      AS settings_tier,
  (r.settings ? 'apps')                                 AS has_apps_settings,

  -- Commerce-side Stripe presence, which is separate from platform billing.
  (SELECT COUNT(*) FROM commerce_subscriptions cs WHERE cs.organisation_id = r.id) AS commerce_subscriptions,

  -- People.
  (SELECT COUNT(*) FROM memberships m WHERE m.organisation_id = r.id) AS memberships,

  -- Usage signals across the main tenant-scoped tables.
  (SELECT COUNT(*) FROM contacts c      WHERE c.organisation_id = r.id AND c.deleted_at IS NULL) AS contacts,
  (SELECT COUNT(*) FROM leads l         WHERE l.organisation_id = r.id) AS leads,
  (SELECT COUNT(*) FROM properties p    WHERE p.organisation_id = r.id AND p.deleted_at IS NULL) AS properties,
  (SELECT COUNT(*) FROM stay_bookings s WHERE s.organisation_id = r.id) AS stay_bookings,
  (SELECT COUNT(*) FROM org_communications oc WHERE oc.organisation_id = r.id AND oc.deleted_at IS NULL) AS communications,
  (SELECT MAX(a.created_at) FROM activities a WHERE a.organisation_id = r.id) AS last_activity_at
FROM rowless r
ORDER BY r.created_at;

\echo '== 7. Suggested classification (counts) =='
-- Heuristic. The commercially significant bucket is active_no_row: real usage,
-- no subscription row, therefore FULL entitlement at no charge.

WITH rowless AS (
  SELECT o.id, o.created_at, o.settings, o.status, o.billing_customer_id
  FROM organisations o
  WHERE NOT EXISTS (
    SELECT 1 FROM platform_subscriptions ps WHERE ps.organisation_id = o.id
  )
),
scored AS (
  SELECT
    r.id,
    r.created_at,
    r.status,
    (r.billing_customer_id IS NOT NULL OR (r.settings ? 'billing')) AS has_billing,
    (SELECT COUNT(*) FROM memberships m WHERE m.organisation_id = r.id) AS members,
    (
      (SELECT COUNT(*) FROM contacts c      WHERE c.organisation_id = r.id AND c.deleted_at IS NULL)
    + (SELECT COUNT(*) FROM leads l         WHERE l.organisation_id = r.id)
    + (SELECT COUNT(*) FROM properties p    WHERE p.organisation_id = r.id AND p.deleted_at IS NULL)
    + (SELECT COUNT(*) FROM stay_bookings s WHERE s.organisation_id = r.id)
    ) AS data_rows
  FROM rowless r
)
SELECT
  CASE
    WHEN has_billing                                    THEN 'legacy_billed'
    WHEN data_rows > 20                                 THEN 'active_no_row'
    WHEN created_at >= now() - interval '30 days'
     AND members > 0                                    THEN 'pre_checkout'
    WHEN members = 0 AND data_rows = 0
     AND created_at < now() - interval '90 days'         THEN 'abandoned'
    WHEN members = 0 AND data_rows = 0                  THEN 'empty_recent'
    ELSE 'review_individually'
  END AS category,
  COUNT(*) AS organisations,
  MIN(created_at)::date AS oldest,
  MAX(created_at)::date AS newest
FROM scored
GROUP BY 1
ORDER BY organisations DESC;

\echo '== 8. Cross-check: subscription rows pointing at missing organisations =='
-- Expect zero. Non-zero means orphaned billing state.

SELECT COUNT(*) AS orphaned_subscription_rows
FROM platform_subscriptions ps
WHERE NOT EXISTS (SELECT 1 FROM organisations o WHERE o.id = ps.organisation_id);

\echo '== 9. Cross-check: organisations with more than one subscription row =='
-- Expect zero rows returned.

SELECT organisation_id, COUNT(*) AS rows
FROM platform_subscriptions
GROUP BY organisation_id
HAVING COUNT(*) > 1;

\echo '== 10. Operator allowlist cross-reference =='
-- Platform operator organisations are expected to be rowless and must not be
-- read as lost revenue. Compare these ids with DG_COMMAND_CENTRE_ORG_IDS.

SELECT id, name, slug, status, created_at::date AS created
FROM organisations
ORDER BY created_at
LIMIT 20;
