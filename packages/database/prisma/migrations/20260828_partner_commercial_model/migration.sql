-- Partner & Delivery commercial model — attribution and ledger extensions (CEO lock 2026-08)

ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "managed_by_partner_id" TEXT,
  ADD COLUMN IF NOT EXISTS "service_commission_bps" INTEGER,
  ADD COLUMN IF NOT EXISTS "override_commission_bps" INTEGER;

CREATE INDEX IF NOT EXISTS "partners_managed_by_partner_id_idx"
  ON "partners"("managed_by_partner_id");

ALTER TABLE "partner_referrals"
  ADD COLUMN IF NOT EXISTS "acquisition_source" TEXT;

ALTER TABLE "partner_commissions"
  ADD COLUMN IF NOT EXISTS "commission_kind" TEXT NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS "revenue_type" TEXT,
  ADD COLUMN IF NOT EXISTS "source_partner_id" TEXT;

CREATE TABLE IF NOT EXISTS "customer_partner_attributions" (
  "id" TEXT NOT NULL,
  "customer_organisation_id" TEXT NOT NULL,
  "acquisition_source" TEXT,
  "reseller_partner_id" TEXT,
  "channel_manager_partner_id" TEXT,
  "delivery_partner_id" TEXT,
  "delivery_channel_manager_id" TEXT,
  "reseller_commission_bps" INTEGER,
  "channel_override_bps" INTEGER,
  "delivery_share_bps" INTEGER,
  "delivery_override_bps" INTEGER,
  "commission_period_start" TIMESTAMP(3),
  "commission_period_end" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customer_partner_attributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_partner_attributions_customer_organisation_id_key"
  ON "customer_partner_attributions"("customer_organisation_id");

CREATE INDEX IF NOT EXISTS "customer_partner_attributions_reseller_partner_id_idx"
  ON "customer_partner_attributions"("reseller_partner_id");

CREATE INDEX IF NOT EXISTS "customer_partner_attributions_channel_manager_partner_id_idx"
  ON "customer_partner_attributions"("channel_manager_partner_id");

CREATE INDEX IF NOT EXISTS "customer_partner_attributions_delivery_partner_id_idx"
  ON "customer_partner_attributions"("delivery_partner_id");
