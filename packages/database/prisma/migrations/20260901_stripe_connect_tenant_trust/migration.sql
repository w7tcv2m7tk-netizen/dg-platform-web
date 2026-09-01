-- Stripe external-account tenant trust boundary (F1/F2/F4).
--
-- Enforce 1:1 trusted mappings so a Stripe external identifier resolves to at
-- most one DigitalGate organisation:
--   * organisations.stripe_connect_account_id   (Connect account -> owning org)
--   * organisations.billing_customer_id          (platform billing customer -> org)
--   * platform_subscriptions.stripe_customer_id
--   * platform_subscriptions.stripe_subscription_id
--
-- The application code fails safe on ambiguity regardless of these constraints;
-- the unique indexes make the 1:1 invariant explicit and enforced at the DB.
--
-- IMPORTANT: creating these unique indexes FAILS if duplicate NON-NULL values
-- already exist. Verify / de-duplicate before applying. NULLs are permitted and
-- treated as distinct by Postgres. Production application is intentionally
-- DEFERRED — do not run `migrate deploy` against production as part of this change.

-- Replace the previous non-unique indexes with unique constraints.
DROP INDEX IF EXISTS "organisations_stripe_connect_account_id_idx";
DROP INDEX IF EXISTS "platform_subscriptions_stripe_customer_id_idx";
DROP INDEX IF EXISTS "platform_subscriptions_stripe_subscription_id_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "organisations_stripe_connect_account_id_key"
  ON "organisations" ("stripe_connect_account_id");

CREATE UNIQUE INDEX IF NOT EXISTS "organisations_billing_customer_id_key"
  ON "organisations" ("billing_customer_id");

CREATE UNIQUE INDEX IF NOT EXISTS "platform_subscriptions_stripe_customer_id_key"
  ON "platform_subscriptions" ("stripe_customer_id");

CREATE UNIQUE INDEX IF NOT EXISTS "platform_subscriptions_stripe_subscription_id_key"
  ON "platform_subscriptions" ("stripe_subscription_id");
