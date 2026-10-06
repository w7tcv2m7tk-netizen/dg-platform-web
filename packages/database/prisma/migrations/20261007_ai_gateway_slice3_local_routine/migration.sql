CREATE TABLE "ai_worker_principals" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credential_hash" TEXT NOT NULL,
  "credential_prefix" TEXT NOT NULL,
  "previous_credential_hash" TEXT,
  "previous_credential_expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "last_seen_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_worker_principals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ai_worker_principals_credential_hash_key" ON "ai_worker_principals"("credential_hash");
CREATE UNIQUE INDEX "ai_worker_principals_previous_credential_hash_key" ON "ai_worker_principals"("previous_credential_hash");
CREATE INDEX "ai_worker_principals_revoked_at_idx" ON "ai_worker_principals"("revoked_at");

CREATE TABLE "ai_worker_claim_receipts" (
  "id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "operation_id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_worker_claim_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ai_worker_claim_receipts_worker_operation_key" ON "ai_worker_claim_receipts"("worker_id", "operation_id");
CREATE INDEX "ai_worker_claim_receipts_created_at_idx" ON "ai_worker_claim_receipts"("created_at");
ALTER TABLE "ai_worker_claim_receipts" ADD CONSTRAINT "ai_worker_claim_receipts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "ai_worker_principals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ai_local_deployments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "endpoint_kind" TEXT NOT NULL DEFAULT 'ollama_loopback',
  "lane" TEXT NOT NULL DEFAULT 'local_routine',
  "model_id" TEXT NOT NULL DEFAULT 'dg-fast:latest',
  "model_digest" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_local_deployments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_local_deployments_lane_check" CHECK ("lane" = 'local_routine'),
  CONSTRAINT "ai_local_deployments_model_check" CHECK ("model_id" = 'dg-fast:latest'),
  CONSTRAINT "ai_local_deployments_digest_check" CHECK ("model_digest" ~ '^(sha256:)?[0-9a-fA-F]{64}$'),
  CONSTRAINT "ai_local_deployments_endpoint_check" CHECK ("endpoint_kind" = 'ollama_loopback')
);
CREATE UNIQUE INDEX "ai_local_deployments_worker_id_name_key" ON "ai_local_deployments"("worker_id", "name");
CREATE INDEX "ai_local_deployments_active_lane_model_idx" ON "ai_local_deployments"("active", "lane", "model_id");
ALTER TABLE "ai_local_deployments" ADD CONSTRAINT "ai_local_deployments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "ai_worker_principals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ai_local_recipient_approvals" (
  "id" TEXT NOT NULL,
  "organisation_id" TEXT NOT NULL,
  "deployment_id" TEXT NOT NULL,
  "approved_by_actor_type" TEXT NOT NULL,
  "approved_by_actor_id" TEXT,
  "policy_version" INTEGER NOT NULL,
  "classification_ceiling" TEXT NOT NULL,
  "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "ai_local_recipient_approvals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_local_recipient_approvals_policy_version_check" CHECK ("policy_version" = 1),
  CONSTRAINT "ai_local_recipient_approvals_actor_type_check" CHECK ("approved_by_actor_type" IN ('user', 'system', 'connector')),
  CONSTRAINT "ai_local_recipient_approvals_actor_id_check" CHECK ("approved_by_actor_type" = 'system' OR "approved_by_actor_id" IS NOT NULL),
  CONSTRAINT "ai_local_recipient_approvals_classification_check" CHECK ("classification_ceiling" IN ('public', 'platform_internal', 'tenant_confidential', 'restricted'))
);
CREATE INDEX "ai_local_recipient_approvals_org_deployment_revoked_idx" ON "ai_local_recipient_approvals"("organisation_id", "deployment_id", "revoked_at");
CREATE UNIQUE INDEX "ai_local_recipient_approvals_one_active_per_org_deployment_key" ON "ai_local_recipient_approvals"("organisation_id", "deployment_id") WHERE "revoked_at" IS NULL;
CREATE INDEX "ai_local_recipient_approvals_org_revoked_idx" ON "ai_local_recipient_approvals"("organisation_id", "revoked_at");
ALTER TABLE "ai_local_recipient_approvals" ADD CONSTRAINT "ai_local_recipient_approvals_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_local_recipient_approvals" ADD CONSTRAINT "ai_local_recipient_approvals_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "ai_local_deployments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ai_inference_jobs" (
  "id" TEXT NOT NULL,
  "organisation_id" TEXT NOT NULL,
  "actor_type" TEXT NOT NULL,
  "actor_id" TEXT,
  "correlation_id" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "task_version" INTEGER NOT NULL,
  "policy_version" INTEGER NOT NULL,
  "classification" TEXT NOT NULL,
  "execution_lane" TEXT NOT NULL,
  "deployment_id" TEXT NOT NULL,
  "approval_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "result_contract" TEXT NOT NULL,
  "result_contract_version" INTEGER NOT NULL,
  "context_budget_tokens" INTEGER NOT NULL,
  "max_output_tokens" INTEGER NOT NULL,
  "max_attempts" INTEGER NOT NULL DEFAULT 2,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "deadline_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "payload_ciphertext" BYTEA,
  "payload_nonce" BYTEA,
  "payload_key_version" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "lease_worker_id" TEXT,
  "lease_token_hash" TEXT,
  "claim_operation_id" TEXT,
  "lease_generation" INTEGER NOT NULL DEFAULT 0,
  "lease_expires_at" TIMESTAMP(3),
  "last_heartbeat_at" TIMESTAMP(3),
  "last_heartbeat_operation_id" TEXT,
  "heartbeat_sequence" INTEGER NOT NULL DEFAULT 0,
  "cancel_requested_at" TIMESTAMP(3),
  "result_ciphertext" BYTEA,
  "result_nonce" BYTEA,
  "result_key_version" TEXT,
  "result_hash" TEXT,
  "result_model" TEXT,
  "usage_input_tokens" INTEGER,
  "usage_output_tokens" INTEGER,
  "completion_operation_id" TEXT,
  "completion_request_hash" TEXT,
  "completion_worker_id" TEXT,
  "completion_lease_token_hash" TEXT,
  "completion_lease_generation" INTEGER,
  "completed_at" TIMESTAMP(3),
  "payload_purge_at" TIMESTAMP(3),
  "result_purge_at" TIMESTAMP(3),
  "metadata_purge_at" TIMESTAMP(3),
  "error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_inference_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_inference_jobs_completion_receipt_check" CHECK (
    ("completion_operation_id" IS NULL AND "completion_request_hash" IS NULL AND "completion_worker_id" IS NULL AND "completion_lease_token_hash" IS NULL AND "completion_lease_generation" IS NULL)
    OR ("completion_operation_id" IS NOT NULL AND "completion_request_hash" IS NOT NULL AND "completion_worker_id" IS NOT NULL AND "completion_lease_token_hash" IS NOT NULL AND "completion_lease_token_hash" ~ '^[0-9a-f]{64}$' AND "completion_lease_generation" IS NOT NULL AND "completion_lease_generation" > 0)),
  CONSTRAINT "ai_inference_jobs_task_check" CHECK ("task" IN ('lead_summary', 'lead_follow_up')),
  CONSTRAINT "ai_inference_jobs_task_version_check" CHECK ("task_version" = 1),
  CONSTRAINT "ai_inference_jobs_policy_version_check" CHECK ("policy_version" = 1),
  CONSTRAINT "ai_inference_jobs_classification_check" CHECK ("classification" IN ('public', 'platform_internal', 'tenant_confidential', 'restricted')),
  CONSTRAINT "ai_inference_jobs_lane_check" CHECK ("execution_lane" = 'local_routine'),
  CONSTRAINT "ai_inference_jobs_contract_check" CHECK ("result_contract" = 'crm_text_v1' AND "result_contract_version" = 1),
  CONSTRAINT "ai_inference_jobs_actor_check" CHECK ("actor_type" IN ('user', 'system', 'connector') AND ("actor_type" = 'system' OR "actor_id" IS NOT NULL)),
  CONSTRAINT "ai_inference_jobs_limits_check" CHECK ("context_budget_tokens" BETWEEN 1 AND 4096 AND "max_output_tokens" BETWEEN 1 AND 1200 AND "max_attempts" BETWEEN 1 AND 3 AND "attempt_count" BETWEEN 0 AND "max_attempts" AND "lease_generation" >= 0 AND "heartbeat_sequence" >= 0 AND "deadline_at" <= "expires_at" AND "created_at" <= "deadline_at"),
  CONSTRAINT "ai_inference_jobs_status_check" CHECK ("status" IN ('queued', 'leased', 'succeeded', 'failed', 'cancelled', 'expired')),
  CONSTRAINT "ai_inference_jobs_completion_state_check" CHECK (("status" IN ('succeeded', 'failed', 'cancelled', 'expired') AND "completed_at" IS NOT NULL) OR ("status" IN ('queued', 'leased') AND "completed_at" IS NULL)),
  CONSTRAINT "ai_inference_jobs_payload_check" CHECK (("payload_ciphertext" IS NULL OR (octet_length("payload_ciphertext") BETWEEN 16 AND 65552 AND octet_length("payload_nonce") = 12 AND "payload_key_version" ~ '^v[1-9][0-9]*$')) AND ("status" IN ('queued', 'leased') AND "payload_ciphertext" IS NOT NULL AND "payload_nonce" IS NOT NULL AND "payload_key_version" IS NOT NULL OR "status" IN ('succeeded', 'failed', 'cancelled', 'expired') AND (("payload_ciphertext" IS NULL AND "payload_nonce" IS NULL AND "payload_key_version" IS NULL) OR ("payload_ciphertext" IS NOT NULL AND "payload_nonce" IS NOT NULL AND "payload_key_version" IS NOT NULL)))),
  CONSTRAINT "ai_inference_jobs_result_check" CHECK (("result_ciphertext" IS NULL OR (octet_length("result_ciphertext") BETWEEN 16 AND 80016 AND octet_length("result_nonce") = 12 AND "result_key_version" ~ '^v[1-9][0-9]*$')) AND (("status" = 'succeeded' AND "result_ciphertext" IS NOT NULL AND "result_nonce" IS NOT NULL AND "result_key_version" IS NOT NULL AND "completed_at" IS NOT NULL AND "result_hash" IS NOT NULL AND "result_model" = 'dg-fast:latest') OR ("status" <> 'succeeded' AND "result_ciphertext" IS NULL AND "result_nonce" IS NULL AND "result_key_version" IS NULL) OR ("status" = 'succeeded' AND "result_ciphertext" IS NULL AND "result_nonce" IS NULL AND "result_key_version" IS NULL AND "result_purge_at" IS NOT NULL))),
  CONSTRAINT "ai_inference_jobs_lease_check" CHECK (("status" = 'leased' AND "lease_worker_id" IS NOT NULL AND "lease_token_hash" IS NOT NULL AND "claim_operation_id" IS NOT NULL AND "lease_expires_at" IS NOT NULL) OR ("status" <> 'leased' AND "lease_worker_id" IS NULL AND "lease_token_hash" IS NULL AND "claim_operation_id" IS NULL AND "lease_expires_at" IS NULL))
);
CREATE INDEX "ai_inference_jobs_status_created_idx" ON "ai_inference_jobs"("status", "created_at");
CREATE INDEX "ai_inference_jobs_status_expires_idx" ON "ai_inference_jobs"("status", "expires_at");
CREATE INDEX "ai_inference_jobs_worker_lease_idx" ON "ai_inference_jobs"("lease_worker_id", "lease_expires_at");
CREATE INDEX "ai_inference_jobs_org_created_idx" ON "ai_inference_jobs"("organisation_id", "created_at");
CREATE INDEX "ai_inference_jobs_deployment_status_idx" ON "ai_inference_jobs"("deployment_id", "status");
CREATE UNIQUE INDEX "ai_inference_jobs_idempotency_actor_key" ON "ai_inference_jobs"("organisation_id", "actor_type", "actor_id", "idempotency_key") WHERE "actor_id" IS NOT NULL;
CREATE UNIQUE INDEX "ai_inference_jobs_idempotency_null_actor_key" ON "ai_inference_jobs"("organisation_id", "actor_type", "idempotency_key") WHERE "actor_id" IS NULL;
CREATE UNIQUE INDEX "ai_inference_jobs_worker_claim_operation_key" ON "ai_inference_jobs"("lease_worker_id", "claim_operation_id") WHERE "lease_worker_id" IS NOT NULL AND "claim_operation_id" IS NOT NULL;
CREATE UNIQUE INDEX "ai_inference_jobs_one_live_lease_per_worker_key" ON "ai_inference_jobs"("lease_worker_id") WHERE "status" = 'leased';
CREATE UNIQUE INDEX "ai_local_recipient_approvals_id_org_deployment_key" ON "ai_local_recipient_approvals"("id", "organisation_id", "deployment_id");
ALTER TABLE "ai_inference_jobs" ADD CONSTRAINT "ai_inference_jobs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_inference_jobs" ADD CONSTRAINT "ai_inference_jobs_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "ai_local_deployments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_inference_jobs" ADD CONSTRAINT "ai_inference_jobs_approval_org_deployment_fkey" FOREIGN KEY ("approval_id", "organisation_id", "deployment_id") REFERENCES "ai_local_recipient_approvals"("id", "organisation_id", "deployment_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_inference_jobs" ADD CONSTRAINT "ai_inference_jobs_lease_worker_id_fkey" FOREIGN KEY ("lease_worker_id") REFERENCES "ai_worker_principals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ai_accounting_outbox" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "organisation_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delivered_at" TIMESTAMP(3),
  "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3),
  CONSTRAINT "ai_accounting_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_accounting_outbox_delivery_attempts_check" CHECK ("delivery_attempts" >= 0),
  CONSTRAINT "ai_accounting_outbox_event_type_check" CHECK ("event_type" = 'ai.assist_generated'),
  CONSTRAINT "ai_accounting_outbox_payload_size_check" CHECK (octet_length("payload"::text) <= 8192),
  CONSTRAINT "ai_accounting_outbox_payload_fields_check" CHECK (("payload" - ARRAY['task', 'taskVersion', 'policyVersion', 'classification', 'executionLane', 'deploymentId', 'model', 'tokensIn', 'tokensOut', 'correlationId']::text[]) = '{}'::jsonb)
);
CREATE UNIQUE INDEX "ai_accounting_outbox_job_id_key" ON "ai_accounting_outbox"("job_id");
CREATE UNIQUE INDEX "ai_accounting_outbox_event_key_key" ON "ai_accounting_outbox"("event_key");
CREATE INDEX "ai_accounting_outbox_delivery_idx" ON "ai_accounting_outbox"("delivered_at", "next_attempt_at");
ALTER TABLE "ai_accounting_outbox" ADD CONSTRAINT "ai_accounting_outbox_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "ai_accounting_outbox_job_scope_check"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "ai_inference_jobs" j WHERE j."id" = NEW."job_id" AND j."organisation_id" = NEW."organisation_id" AND j."status" = 'succeeded') THEN
    RAISE EXCEPTION 'AI accounting outbox job scope mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ai_accounting_outbox_job_scope_check_trigger" BEFORE INSERT ON "ai_accounting_outbox" FOR EACH ROW EXECUTE FUNCTION "ai_accounting_outbox_job_scope_check"();

CREATE FUNCTION "ai_inference_jobs_terminal_immutable"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'queued' AND NEW."status" NOT IN ('queued', 'leased', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'invalid AI job state transition';
  END IF;
  IF OLD."status" = 'leased' AND NEW."status" NOT IN ('leased', 'queued', 'succeeded', 'failed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'invalid AI job state transition';
  END IF;
  IF OLD."status" IN ('succeeded', 'failed', 'cancelled', 'expired') THEN
    IF NEW."status" <> OLD."status"
      OR NEW."organisation_id" IS DISTINCT FROM OLD."organisation_id"
      OR NEW."actor_type" IS DISTINCT FROM OLD."actor_type"
      OR NEW."actor_id" IS DISTINCT FROM OLD."actor_id"
      OR NEW."correlation_id" IS DISTINCT FROM OLD."correlation_id"
      OR NEW."task" IS DISTINCT FROM OLD."task"
      OR NEW."task_version" IS DISTINCT FROM OLD."task_version"
      OR NEW."policy_version" IS DISTINCT FROM OLD."policy_version"
      OR NEW."classification" IS DISTINCT FROM OLD."classification"
      OR NEW."execution_lane" IS DISTINCT FROM OLD."execution_lane"
      OR NEW."deployment_id" IS DISTINCT FROM OLD."deployment_id"
      OR NEW."approval_id" IS DISTINCT FROM OLD."approval_id"
      OR NEW."idempotency_key" IS DISTINCT FROM OLD."idempotency_key"
      OR NEW."request_hash" IS DISTINCT FROM OLD."request_hash"
      OR NEW."result_contract" IS DISTINCT FROM OLD."result_contract"
      OR NEW."result_contract_version" IS DISTINCT FROM OLD."result_contract_version"
      OR NEW."context_budget_tokens" IS DISTINCT FROM OLD."context_budget_tokens"
      OR NEW."max_output_tokens" IS DISTINCT FROM OLD."max_output_tokens"
      OR NEW."max_attempts" IS DISTINCT FROM OLD."max_attempts"
      OR NEW."attempt_count" IS DISTINCT FROM OLD."attempt_count"
      OR NEW."cancel_requested_at" IS DISTINCT FROM OLD."cancel_requested_at"
      OR NEW."deadline_at" IS DISTINCT FROM OLD."deadline_at"
      OR NEW."expires_at" IS DISTINCT FROM OLD."expires_at"
      OR NEW."lease_generation" IS DISTINCT FROM OLD."lease_generation"
      OR NEW."heartbeat_sequence" IS DISTINCT FROM OLD."heartbeat_sequence"
      OR NEW."last_heartbeat_at" IS DISTINCT FROM OLD."last_heartbeat_at"
      OR NEW."last_heartbeat_operation_id" IS DISTINCT FROM OLD."last_heartbeat_operation_id"
      OR NEW."result_hash" IS DISTINCT FROM OLD."result_hash"
      OR NEW."result_model" IS DISTINCT FROM OLD."result_model"
      OR NEW."usage_input_tokens" IS DISTINCT FROM OLD."usage_input_tokens"
      OR NEW."usage_output_tokens" IS DISTINCT FROM OLD."usage_output_tokens"
      OR NEW."completion_operation_id" IS DISTINCT FROM OLD."completion_operation_id"
      OR NEW."completion_request_hash" IS DISTINCT FROM OLD."completion_request_hash"
      OR NEW."completion_worker_id" IS DISTINCT FROM OLD."completion_worker_id"
      OR NEW."completion_lease_token_hash" IS DISTINCT FROM OLD."completion_lease_token_hash"
      OR NEW."completion_lease_generation" IS DISTINCT FROM OLD."completion_lease_generation"
      OR NEW."completed_at" IS DISTINCT FROM OLD."completed_at"
      OR NEW."payload_purge_at" IS DISTINCT FROM OLD."payload_purge_at"
      OR NEW."result_purge_at" IS DISTINCT FROM OLD."result_purge_at"
      OR NEW."metadata_purge_at" IS DISTINCT FROM OLD."metadata_purge_at"
      OR NEW."error_code" IS DISTINCT FROM OLD."error_code"
    THEN RAISE EXCEPTION 'terminal AI inference job is immutable';
    END IF;
    IF NEW."lease_worker_id" IS NOT NULL OR NEW."lease_token_hash" IS NOT NULL OR NEW."claim_operation_id" IS NOT NULL OR NEW."lease_expires_at" IS NOT NULL THEN
      RAISE EXCEPTION 'terminal AI inference job cannot regain a lease';
    END IF;
    IF (NEW."payload_ciphertext" IS NULL) <> (NEW."payload_nonce" IS NULL) OR (NEW."payload_ciphertext" IS NULL) <> (NEW."payload_key_version" IS NULL) THEN
      RAISE EXCEPTION 'AI payload must be purged as one unit';
    END IF;
    IF (NEW."result_ciphertext" IS NULL) <> (NEW."result_nonce" IS NULL) OR (NEW."result_ciphertext" IS NULL) <> (NEW."result_key_version" IS NULL) THEN
      RAISE EXCEPTION 'AI result must be purged as one unit';
    END IF;
    IF OLD."payload_ciphertext" IS NOT NULL AND NEW."payload_ciphertext" IS NULL AND (OLD."payload_purge_at" IS NULL OR OLD."payload_purge_at" > (NOW() AT TIME ZONE 'UTC')) THEN
      RAISE EXCEPTION 'AI payload retention period has not elapsed';
    END IF;
    IF OLD."payload_ciphertext" IS NULL AND NEW."payload_ciphertext" IS NOT NULL THEN
      RAISE EXCEPTION 'purged AI payload cannot be restored';
    END IF;
    IF OLD."payload_ciphertext" IS NOT NULL AND NEW."payload_ciphertext" IS NOT NULL AND
      (NEW."payload_ciphertext" IS DISTINCT FROM OLD."payload_ciphertext" OR NEW."payload_nonce" IS DISTINCT FROM OLD."payload_nonce" OR NEW."payload_key_version" IS DISTINCT FROM OLD."payload_key_version") THEN
      RAISE EXCEPTION 'terminal AI payload is immutable';
    END IF;
    IF OLD."result_ciphertext" IS NOT NULL AND NEW."result_ciphertext" IS NULL AND (OLD."result_purge_at" IS NULL OR OLD."result_purge_at" > (NOW() AT TIME ZONE 'UTC')) THEN
      RAISE EXCEPTION 'AI result retention period has not elapsed';
    END IF;
    IF OLD."result_ciphertext" IS NULL AND NEW."result_ciphertext" IS NOT NULL THEN
      RAISE EXCEPTION 'purged AI result cannot be restored';
    END IF;
    IF OLD."result_ciphertext" IS NOT NULL AND NEW."result_ciphertext" IS NOT NULL AND
      (NEW."result_ciphertext" IS DISTINCT FROM OLD."result_ciphertext" OR NEW."result_nonce" IS DISTINCT FROM OLD."result_nonce" OR NEW."result_key_version" IS DISTINCT FROM OLD."result_key_version") THEN
      RAISE EXCEPTION 'terminal AI result is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ai_inference_jobs_terminal_immutable_trigger" BEFORE UPDATE ON "ai_inference_jobs" FOR EACH ROW EXECUTE FUNCTION "ai_inference_jobs_terminal_immutable"();

-- Recheck elapsed wall time at transaction end, after the result/outbox writes.
-- NOW()/CURRENT_TIMESTAMP alone would retain the transaction-start timestamp.
CREATE FUNCTION "ai_inference_jobs_completion_deadline_check"() RETURNS trigger AS $$
BEGIN
  IF OLD."lease_expires_at" <= (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') OR OLD."deadline_at" <= (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') OR OLD."expires_at" <= (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') THEN
    RAISE EXCEPTION 'AI completion lease or deadline expired before commit';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "ai_inference_jobs_completion_deadline_trigger"
AFTER UPDATE ON "ai_inference_jobs" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (OLD."status" = 'leased' AND NEW."status" <> 'leased'
  AND NEW."completion_operation_id" IS NOT NULL
  AND NEW."completion_operation_id" IS DISTINCT FROM OLD."completion_operation_id")
EXECUTE FUNCTION "ai_inference_jobs_completion_deadline_check"();
