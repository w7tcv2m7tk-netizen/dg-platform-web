-- DigitalGate Business Brain Knowledge foundation
-- Organisation-scoped governed knowledge with provenance, lifecycle and relationships.

CREATE TABLE "business_knowledge_sources" (
  "id" TEXT NOT NULL,
  "organisation_id" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "title" TEXT,
  "source_app" TEXT,
  "source_ref" TEXT,
  "captured_at" TIMESTAMP(3),
  "content_hash" TEXT,
  "access_classification" TEXT NOT NULL DEFAULT 'internal',
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_knowledge_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_knowledge_sources_org_source_ref_key"
  ON "business_knowledge_sources"("organisation_id", "source_ref")
  WHERE "source_ref" IS NOT NULL;
CREATE INDEX "business_knowledge_sources_org_type_idx"
  ON "business_knowledge_sources"("organisation_id", "source_type");
CREATE INDEX "business_knowledge_sources_org_captured_idx"
  ON "business_knowledge_sources"("organisation_id", "captured_at");
CREATE INDEX "business_knowledge_sources_content_hash_idx"
  ON "business_knowledge_sources"("content_hash")
  WHERE "content_hash" IS NOT NULL;

CREATE TABLE "business_knowledge_items" (
  "id" TEXT NOT NULL,
  "organisation_id" TEXT NOT NULL,
  "knowledge_key" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'proposed',
  "confidence" DOUBLE PRECISION,
  "importance" TEXT NOT NULL DEFAULT 'medium',
  "scope" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "source_id" TEXT,
  "source_ref" TEXT,
  "source_excerpt" TEXT,
  "created_by" TEXT,
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "supersedes_id" TEXT,
  "effective_from" TIMESTAMP(3),
  "review_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_knowledge_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_knowledge_items_status_check"
    CHECK ("status" IN ('proposed', 'approved', 'superseded', 'archived', 'rejected')),
  CONSTRAINT "business_knowledge_items_confidence_check"
    CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

CREATE UNIQUE INDEX "business_knowledge_items_org_key_key"
  ON "business_knowledge_items"("organisation_id", "knowledge_key")
  WHERE "knowledge_key" IS NOT NULL;
CREATE INDEX "business_knowledge_items_org_status_idx"
  ON "business_knowledge_items"("organisation_id", "status");
CREATE INDEX "business_knowledge_items_org_type_status_idx"
  ON "business_knowledge_items"("organisation_id", "type", "status");
CREATE INDEX "business_knowledge_items_org_importance_idx"
  ON "business_knowledge_items"("organisation_id", "importance", "status");
CREATE INDEX "business_knowledge_items_source_idx"
  ON "business_knowledge_items"("source_id");
CREATE INDEX "business_knowledge_items_supersedes_idx"
  ON "business_knowledge_items"("supersedes_id");
CREATE INDEX "business_knowledge_items_scope_gin_idx"
  ON "business_knowledge_items" USING GIN ("scope");

CREATE TABLE "business_knowledge_links" (
  "id" TEXT NOT NULL,
  "organisation_id" TEXT NOT NULL,
  "knowledge_item_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "relation_type" TEXT NOT NULL DEFAULT 'related_to',
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_knowledge_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_knowledge_links_unique_target"
  ON "business_knowledge_links"("knowledge_item_id", "target_type", "target_id", "relation_type");
CREATE INDEX "business_knowledge_links_org_target_idx"
  ON "business_knowledge_links"("organisation_id", "target_type", "target_id");
CREATE INDEX "business_knowledge_links_item_idx"
  ON "business_knowledge_links"("knowledge_item_id");

ALTER TABLE "business_knowledge_sources"
  ADD CONSTRAINT "business_knowledge_sources_organisation_id_fkey"
  FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_knowledge_items"
  ADD CONSTRAINT "business_knowledge_items_organisation_id_fkey"
  FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_knowledge_items"
  ADD CONSTRAINT "business_knowledge_items_source_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "business_knowledge_sources"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_knowledge_items"
  ADD CONSTRAINT "business_knowledge_items_supersedes_id_fkey"
  FOREIGN KEY ("supersedes_id") REFERENCES "business_knowledge_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_knowledge_links"
  ADD CONSTRAINT "business_knowledge_links_organisation_id_fkey"
  FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_knowledge_links"
  ADD CONSTRAINT "business_knowledge_links_knowledge_item_id_fkey"
  FOREIGN KEY ("knowledge_item_id") REFERENCES "business_knowledge_items"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
