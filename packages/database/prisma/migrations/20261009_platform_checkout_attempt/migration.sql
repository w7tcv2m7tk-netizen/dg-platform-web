-- Additive only. No backfill: legacy session IDs are reconciled before first use.
CREATE TABLE "platform_checkout_attempts" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "current_organisation_id" TEXT,
    "purchase_fingerprint" TEXT NOT NULL,
    "request_parameters" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "provider_scope" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PREPARED',
    "session_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "first_requested_at" TIMESTAMP(3),
    "replay_until" TIMESTAMP(3) NOT NULL,
    "legacy_session_ids" JSONB NOT NULL,
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "recovery_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_checkout_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "platform_checkout_attempts_current_owner_check"
      CHECK ("current_organisation_id" IS NULL OR "current_organisation_id" = "organisation_id"),
    CONSTRAINT "platform_checkout_attempts_state_check"
      CHECK ("state" IN ('PREPARED', 'UNCERTAIN', 'OPEN', 'AWAITING_WEBHOOK', 'EXPIRED', 'RECOVERY_REQUIRED')),
    CONSTRAINT "platform_checkout_attempts_release_check"
      CHECK (("current_organisation_id" IS NULL) = ("state" = 'EXPIRED')),
    CONSTRAINT "platform_checkout_attempts_organisation_id_fkey"
      FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "platform_checkout_attempts_current_organisation_id_key"
  ON "platform_checkout_attempts"("current_organisation_id");
CREATE UNIQUE INDEX "platform_checkout_attempts_idempotency_key_key"
  ON "platform_checkout_attempts"("idempotency_key");
CREATE UNIQUE INDEX "platform_checkout_attempts_session_id_key"
  ON "platform_checkout_attempts"("session_id");
CREATE INDEX "platform_checkout_attempts_organisation_id_created_at_idx"
  ON "platform_checkout_attempts"("organisation_id", "created_at");
