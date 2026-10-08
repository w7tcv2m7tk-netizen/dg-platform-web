-- Additive only. Legacy reports retain their attached audit; no evidence is backfilled.
ALTER TABLE "growth_prospect_reports"
  ADD COLUMN "prospect_snapshot" JSONB,
  ADD COLUMN "revoked_at" TIMESTAMP(3);
