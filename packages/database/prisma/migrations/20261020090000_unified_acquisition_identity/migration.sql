-- Additive only: legacy metadata remains unchanged and unverified.
-- NULL owner/ABN rows intentionally remain outside tenant identity uniqueness.
ALTER TABLE "growth_prospects" ADD COLUMN "abn" VARCHAR(11), ADD COLUMN "identity_provenance" JSONB;
ALTER TABLE "companies" ADD COLUMN "abn" VARCHAR(11), ADD COLUMN "identity_provenance" JSONB;
ALTER TABLE "growth_prospects" ADD CONSTRAINT "growth_prospects_abn_format" CHECK (abn IS NULL OR abn ~ '^[0-9]{11}$');
ALTER TABLE "companies" ADD CONSTRAINT "companies_abn_format" CHECK (abn IS NULL OR abn ~ '^[0-9]{11}$');
CREATE UNIQUE INDEX "growth_prospects_organisation_id_abn_key" ON "growth_prospects"("organisation_id", "abn");
CREATE UNIQUE INDEX "companies_organisation_id_abn_key" ON "companies"("organisation_id", "abn");
