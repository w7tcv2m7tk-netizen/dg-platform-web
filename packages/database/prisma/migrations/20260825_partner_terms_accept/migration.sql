-- Partner programme terms acceptance (product record)
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP(3);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "terms_version" TEXT;
