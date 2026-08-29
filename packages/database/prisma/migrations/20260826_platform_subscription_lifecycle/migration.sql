-- Platform SaaS subscription lifecycle (commercial state ≠ entitlement)
CREATE TABLE IF NOT EXISTS "platform_subscriptions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIALING',
    "entitlement" TEXT NOT NULL DEFAULT 'FULL',
    "plan_tier" TEXT,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_status" TEXT,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "payment_failed_at" TIMESTAMP(3),
    "grace_period_ends_at" TIMESTAMP(3),
    "restricted_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "retention_ends_at" TIMESTAMP(3),
    "founding_customer" BOOLEAN NOT NULL DEFAULT false,
    "platform_exempt" BOOLEAN NOT NULL DEFAULT false,
    "day3_reminder_at" TIMESTAMP(3),
    "day7_reminder_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_subscriptions_organisation_id_key" ON "platform_subscriptions"("organisation_id");
CREATE INDEX IF NOT EXISTS "platform_subscriptions_status_idx" ON "platform_subscriptions"("status");
CREATE INDEX IF NOT EXISTS "platform_subscriptions_stripe_customer_id_idx" ON "platform_subscriptions"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "platform_subscriptions_stripe_subscription_id_idx" ON "platform_subscriptions"("stripe_subscription_id");

DO $$ BEGIN
  ALTER TABLE "platform_subscriptions"
    ADD CONSTRAINT "platform_subscriptions_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "platform_subscription_events" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "stripe_event_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_subscription_events_stripe_event_id_key" ON "platform_subscription_events"("stripe_event_id");
CREATE INDEX IF NOT EXISTS "platform_subscription_events_organisation_id_created_at_idx" ON "platform_subscription_events"("organisation_id", "created_at");
CREATE INDEX IF NOT EXISTS "platform_subscription_events_subscription_id_created_at_idx" ON "platform_subscription_events"("subscription_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "platform_subscription_events"
    ADD CONSTRAINT "platform_subscription_events_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "platform_subscription_events"
    ADD CONSTRAINT "platform_subscription_events_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "platform_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "stripe_webhook_receipts" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "organisation_id" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stripe_webhook_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stripe_webhook_receipts_event_id_key" ON "stripe_webhook_receipts"("event_id");
CREATE INDEX IF NOT EXISTS "stripe_webhook_receipts_processed_at_idx" ON "stripe_webhook_receipts"("processed_at");

DO $$ BEGIN
  ALTER TABLE "stripe_webhook_receipts"
    ADD CONSTRAINT "stripe_webhook_receipts_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill from Organisation.settings.billing + status (thin projection; entitlement recalculated in app)
INSERT INTO "platform_subscriptions" (
  "id",
  "organisation_id",
  "status",
  "entitlement",
  "plan_tier",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_status",
  "founding_customer",
  "platform_exempt",
  "suspended_at",
  "cancelled_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid()::text,
  o.id,
  CASE
    WHEN COALESCE((o.settings->'billing'->>'platformExempt')::boolean, false) THEN 'ACTIVE'
    WHEN LOWER(COALESCE(o.settings->'billing'->>'subscriptionStatus', '')) IN ('past_due') THEN 'PAYMENT_FAILED'
    WHEN LOWER(COALESCE(o.settings->'billing'->>'subscriptionStatus', '')) IN ('cancelled', 'canceled', 'unpaid')
      OR o.status = 'suspended' THEN 'CANCELLED'
    WHEN LOWER(COALESCE(o.settings->'billing'->>'subscriptionStatus', '')) = 'trialing'
      OR o.status = 'trial' THEN 'TRIALING'
    WHEN o.billing_customer_id IS NOT NULL
      OR LOWER(COALESCE(o.settings->'billing'->>'subscriptionStatus', '')) IN ('active') THEN 'ACTIVE'
    ELSE 'TRIALING'
  END,
  CASE
    WHEN COALESCE((o.settings->'billing'->>'platformExempt')::boolean, false) THEN 'FULL'
    WHEN COALESCE((o.settings->'billing'->>'foundingCustomer')::boolean, false) THEN 'FULL'
    WHEN LOWER(COALESCE(o.settings->'billing'->>'subscriptionStatus', '')) IN ('cancelled', 'canceled', 'unpaid')
      OR o.status = 'suspended' THEN 'NONE'
    WHEN LOWER(COALESCE(o.settings->'billing'->>'subscriptionStatus', '')) = 'past_due' THEN 'FULL_WITH_WARNING'
    ELSE 'FULL'
  END,
  NULLIF(o.settings->'profile'->>'platformTier', ''),
  o.billing_customer_id,
  NULLIF(o.settings->'billing'->>'stripeSubscriptionId', ''),
  NULLIF(o.settings->'billing'->>'subscriptionStatus', ''),
  COALESCE(
    (o.settings->'billing'->>'foundingCustomer')::boolean,
    LOWER(COALESCE(o.settings->'billing'->>'programme', '')) IN ('founding', 'founding_customer')
  ),
  COALESCE((o.settings->'billing'->>'platformExempt')::boolean, false),
  CASE
    WHEN o.settings->'billing'->>'suspendedAt' IS NOT NULL
      THEN (o.settings->'billing'->>'suspendedAt')::timestamptz
    ELSE NULL
  END,
  CASE
    WHEN LOWER(COALESCE(o.settings->'billing'->>'subscriptionStatus', '')) IN ('cancelled', 'canceled')
      THEN NOW()
    ELSE NULL
  END,
  o.created_at,
  NOW()
FROM "organisations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "platform_subscriptions" ps WHERE ps.organisation_id = o.id
);
