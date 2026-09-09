-- Anonymous public Ask Aida conversations (DigitalGate website).
-- organisation_id is always server-resolved; token_hash is the visitor credential.

CREATE TABLE "aida_conversations" (
  "id" TEXT NOT NULL,
  "organisation_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "messages" JSONB NOT NULL,
  "visitor_context" JSONB,
  "contact_id" TEXT,
  "lead_id" TEXT,
  "page_slug" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aida_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aida_conversations_token_hash_key" ON "aida_conversations"("token_hash");
CREATE INDEX "aida_conversations_org_created_idx" ON "aida_conversations"("organisation_id", "created_at");
CREATE INDEX "aida_conversations_expires_idx" ON "aida_conversations"("expires_at");

ALTER TABLE "aida_conversations"
  ADD CONSTRAINT "aida_conversations_organisation_id_fkey"
  FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
