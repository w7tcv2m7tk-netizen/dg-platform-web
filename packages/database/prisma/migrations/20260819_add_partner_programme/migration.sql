-- DigitalGate Partner Programme
-- Migration: add_partner_programme
-- Generated: 2026-08-19

-- Partner
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "partner_type" TEXT NOT NULL,
    "cohort" TEXT,
    "commission_bps" INTEGER NOT NULL DEFAULT 2000,
    "commission_duration_months" INTEGER NOT NULL DEFAULT 12,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "referral_code" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "business_name" TEXT,
    "notes" TEXT,
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partners_referral_code_key" ON "partners"("referral_code");
CREATE INDEX "partners_clerk_user_id_idx" ON "partners"("clerk_user_id");
CREATE INDEX "partners_status_idx" ON "partners"("status");
CREATE INDEX "partners_referral_code_idx" ON "partners"("referral_code");

-- PartnerReferral
CREATE TABLE "partner_referrals" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'link',
    "status" TEXT NOT NULL DEFAULT 'REFERRED',
    "referred_contact_id" TEXT,
    "referred_organisation_id" TEXT,
    "referred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contacted_at" TIMESTAMP(3),
    "consultation_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_referrals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_referrals_partner_id_status_idx" ON "partner_referrals"("partner_id", "status");
CREATE INDEX "partner_referrals_referral_code_idx" ON "partner_referrals"("referral_code");
CREATE INDEX "partner_referrals_email_idx" ON "partner_referrals"("email");
CREATE INDEX "partner_referrals_referred_organisation_id_idx" ON "partner_referrals"("referred_organisation_id");

ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PartnerCommission
CREATE TABLE "partner_commissions" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "customer_organisation_id" TEXT,
    "subscription_id" TEXT,
    "commission_bps" INTEGER NOT NULL,
    "qualifying_revenue_cents" INTEGER NOT NULL,
    "commission_amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'CALCULATED',
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_commissions_partner_id_status_idx" ON "partner_commissions"("partner_id", "status");
CREATE INDEX "partner_commissions_referral_id_idx" ON "partner_commissions"("referral_id");
CREATE INDEX "partner_commissions_customer_organisation_id_idx" ON "partner_commissions"("customer_organisation_id");

ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_referral_id_fkey"
    FOREIGN KEY ("referral_id") REFERENCES "partner_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PartnerCommissionEvent
CREATE TABLE "partner_commission_events" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "commission_id" TEXT,
    "subscription_id" TEXT,
    "invoice_id" TEXT,
    "event_type" TEXT NOT NULL,
    "qualifying_amount_cents" INTEGER NOT NULL,
    "commission_bps" INTEGER NOT NULL,
    "commission_amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "period" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_commission_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_commission_events_partner_id_idx" ON "partner_commission_events"("partner_id");
CREATE INDEX "partner_commission_events_referral_id_idx" ON "partner_commission_events"("referral_id");
CREATE INDEX "partner_commission_events_commission_id_idx" ON "partner_commission_events"("commission_id");
CREATE INDEX "partner_commission_events_invoice_id_idx" ON "partner_commission_events"("invoice_id");

ALTER TABLE "partner_commission_events" ADD CONSTRAINT "partner_commission_events_commission_id_fkey"
    FOREIGN KEY ("commission_id") REFERENCES "partner_commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
