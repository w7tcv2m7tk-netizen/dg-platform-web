CREATE TABLE "ai_visibility_prompts" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "prompt_class" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "topic" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en-AU',
    "market" TEXT NOT NULL DEFAULT 'AU',
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "rationale" TEXT,
    "metadata" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_visibility_prompts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_visibility_competitors" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "rationale" TEXT,
    "metadata" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_visibility_competitors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_visibility_observations" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "engine_model" TEXT,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "brand_mentioned" BOOLEAN NOT NULL DEFAULT false,
    "brand_recommended" BOOLEAN NOT NULL DEFAULT false,
    "answer_rank" INTEGER,
    "cited_own_domain" BOOLEAN NOT NULL DEFAULT false,
    "citation_capture_complete" BOOLEAN,
    "competitor_capture_complete" BOOLEAN,
    "answer_context" TEXT,
    "source_ref" TEXT,
    "evidence" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_visibility_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_visibility_competitor_mentions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "observation_id" TEXT NOT NULL,
    "competitor_id" TEXT NOT NULL,
    "mentioned" BOOLEAN NOT NULL DEFAULT true,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "answer_rank" INTEGER,
    "context" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_visibility_competitor_mentions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_visibility_citations" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "observation_id" TEXT NOT NULL,
    "competitor_id" TEXT,
    "source_domain" TEXT NOT NULL,
    "cited_url" TEXT NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT 'third_party',
    "opportunity_class" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_visibility_citations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_visibility_prompts_organisation_id_prompt_text_key" ON "ai_visibility_prompts"("organisation_id", "prompt_text");
CREATE INDEX "ai_visibility_prompts_organisation_id_status_idx" ON "ai_visibility_prompts"("organisation_id", "status");
CREATE INDEX "ai_visibility_prompts_organisation_id_prompt_class_status_idx" ON "ai_visibility_prompts"("organisation_id", "prompt_class", "status");
CREATE UNIQUE INDEX "ai_visibility_competitors_organisation_id_name_key" ON "ai_visibility_competitors"("organisation_id", "name");
CREATE INDEX "ai_visibility_competitors_organisation_id_status_idx" ON "ai_visibility_competitors"("organisation_id", "status");
CREATE INDEX "ai_visibility_competitors_organisation_id_domain_idx" ON "ai_visibility_competitors"("organisation_id", "domain");
CREATE INDEX "ai_visibility_observations_organisation_id_observed_at_idx" ON "ai_visibility_observations"("organisation_id", "observed_at");
CREATE INDEX "ai_visibility_observations_organisation_id_engine_observed_at_idx" ON "ai_visibility_observations"("organisation_id", "engine", "observed_at");
CREATE INDEX "ai_visibility_observations_prompt_id_observed_at_idx" ON "ai_visibility_observations"("prompt_id", "observed_at");
CREATE UNIQUE INDEX "ai_visibility_competitor_mentions_observation_id_competitor_id_key" ON "ai_visibility_competitor_mentions"("observation_id", "competitor_id");
CREATE INDEX "ai_visibility_competitor_mentions_organisation_id_competitor_id_created_at_idx" ON "ai_visibility_competitor_mentions"("organisation_id", "competitor_id", "created_at");
CREATE INDEX "ai_visibility_citations_organisation_id_source_domain_last_seen_at_idx" ON "ai_visibility_citations"("organisation_id", "source_domain", "last_seen_at");
CREATE INDEX "ai_visibility_citations_organisation_id_source_type_last_seen_at_idx" ON "ai_visibility_citations"("organisation_id", "source_type", "last_seen_at");
CREATE INDEX "ai_visibility_citations_observation_id_idx" ON "ai_visibility_citations"("observation_id");
CREATE INDEX "ai_visibility_citations_competitor_id_idx" ON "ai_visibility_citations"("competitor_id");

ALTER TABLE "ai_visibility_prompts" ADD CONSTRAINT "ai_visibility_prompts_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_visibility_competitors" ADD CONSTRAINT "ai_visibility_competitors_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_visibility_observations" ADD CONSTRAINT "ai_visibility_observations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_visibility_observations" ADD CONSTRAINT "ai_visibility_observations_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "ai_visibility_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_visibility_competitor_mentions" ADD CONSTRAINT "ai_visibility_competitor_mentions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_visibility_competitor_mentions" ADD CONSTRAINT "ai_visibility_competitor_mentions_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "ai_visibility_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_visibility_competitor_mentions" ADD CONSTRAINT "ai_visibility_competitor_mentions_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "ai_visibility_competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_visibility_citations" ADD CONSTRAINT "ai_visibility_citations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_visibility_citations" ADD CONSTRAINT "ai_visibility_citations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "ai_visibility_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_visibility_citations" ADD CONSTRAINT "ai_visibility_citations_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "ai_visibility_competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
