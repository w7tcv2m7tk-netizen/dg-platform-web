-- Dedicated security receipts; no credentials, request bodies or signatures.
CREATE TABLE ai_worker_provisioning_receipts (
  nonce text PRIMARY KEY CHECK (nonce ~ '^[a-f0-9]{64}$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  window_id text NOT NULL CHECK (window_id ~ '^[a-f0-9]{32}$'),
  operation text NOT NULL CHECK (operation IN ('provision', 'recover')),
  outcome text NOT NULL CHECK (outcome IN ('attempt', 'succeeded', 'duplicate', 'identity_mismatch', 'mutation_failed', 'window_closed')),
  worker_id text,
  deployment_id text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz
);
CREATE INDEX ai_worker_provisioning_window_idx ON ai_worker_provisioning_receipts (window_id, created_at);

-- Database-level duplicate protection also fences legacy/concurrent writers.
CREATE UNIQUE INDEX ai_worker_pinned_name_unique ON ai_worker_principals (name) WHERE name = 'dg-mac-1';
