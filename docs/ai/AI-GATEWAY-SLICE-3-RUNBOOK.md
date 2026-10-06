# AI Gateway Slice 3 operations

## One-time setup

1. Provision `AI_JOB_ENCRYPTION_KEY_V1` as a dedicated 32-byte key encoded as 64 hex characters or unpadded base64url. Do not put it in source, a client bundle, or a Mac worker. The cloud application runtime needs this secret before local enqueue or result reads can work.
2. Apply `20261007_ai_gateway_slice3_local_routine` through the normal reviewed database migration process. This repository change does not apply it automatically.
3. Install only the approved `dg-fast:latest` deployment on the Mac. Verify its Ollama tag digest and Qwen3.5 9B Q4_K_M identity locally with `/api/tags`.
4. Provision a server machine principal and deployment from a controlled environment with a safe `DATABASE_URL`:

   ```sh
   node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/provision-ai-local-worker.mjs dg-mac-1 <verified-ollama-digest>
   ```

   The one-time JSON output contains the bearer credential. Transfer it directly into the Mac Keychain and discard the transient output. Do not paste it into tickets, chat, shell history, or logs. Give the deployment ID from that output to the organisation owner/admin for approval.
5. An organisation owner/admin explicitly approves that deployment with `POST /api/v1/ai/local-recipient-approvals`, choosing the highest classification the organisation permits. Revoke with `DELETE /api/v1/ai/local-recipient-approvals/{id}`. Revocation blocks new claims and prevents heartbeat/completion; it cannot recall plaintext already disclosed to a currently leased worker.
6. Store the credential in macOS Keychain under service `com.digitalgate.ai-worker`, account equal to the worker ID (for example, run `security add-generic-password -U -s com.digitalgate.ai-worker -a <worker-id>` and enter the credential at the prompt). Configure `DG_AI_GATEWAY_URL`, `DG_AI_WORKER_ID`, and `DG_FAST_OLLAMA_DIGEST` in the launchd environment. Only the URL is public configuration; never put the credential in the plist.
7. Start the worker with Node 24 or newer. Install a launchd job only after the credential and pinned digest are confirmed. The worker opens no listening port and never changes the Ollama bind address.

## Locked Ollama profile

`dg-fast:latest`, verified Qwen3.5 9B Q4_K_M digest; `/api/chat`; `stream:false`; `think:false`; `num_ctx:4096`; `num_predict` from the authorised task; `temperature:0.2`; `top_k:20`; `top_p:0.9`; `presence_penalty:1.5`; `keep_alive:"5m"`. The worker concurrency is one. No substitution or tuning is allowed in Slice 3.

## Deadlines, retention and recovery

Control-plane enqueue is bounded by 12 seconds. Jobs expire after five minutes; worker inference is capped at 90 seconds, leases at 30 seconds and heartbeats at ten seconds. The maintenance cron runs every five minutes to recover expired leases, expire jobs, purge payloads one hour after terminal state, purge results after 24 hours, remove terminal metadata after 90 days and delete delivered accounting events after 13 calendar months. Undelivered outbox events retry with capped backoff and are never purged.

Cloud completion validates output/model/digest and commits ciphertext, terminal state and one outbox event atomically. The maintenance route writes the event to the existing activity/audit ledger in a single transaction and marks it delivered in that same transaction. Inspect outbox age and retry count; never repair an event by copying prompt/result content into logs.

Completion locks the unrevoked worker, active deployment, active tenant approval and job until commit. Its conditional write rechecks the live lease token/generation, cancellation and database wall-clock deadlines. PostgreSQL `NOW()` is transaction-start time, so the write also checks `CLOCK_TIMESTAMP()` and a deferred constraint trigger rejects expiry before transaction end. SQL timestamps explicitly use UTC. Duplicate acknowledgements require the saved completion worker, hashed lease token, current generation and request hash, plus current recipient/worker/deployment authority; a superseded retry generation is rejected.

## Disposable database verification

With PostgreSQL 18 binaries already installed, run:

```sh
npm run test:ai-local-db -- "$PG_BIN"
```

Set `PG_BIN` to the actual installed PostgreSQL 18 binary directory on your machine. The runner installs nothing, ignores inherited database and libpq connection settings, creates a fresh `dg-slice3-pg-*` cluster in the operating system temporary directory on a random non-default `127.0.0.1` port, and verifies a per-cluster nonce before test mutations. Historical migrations have no empty-database baseline, so it materializes the pinned Slice 2 Prisma schema at commit `7301af172417c07773db935f6e10b7c7dc7fd937`, then applies the exact Slice 3 SQL migration. All fixtures are synthetic. Real PostgreSQL row locks and advisory barriers establish completion races. The runner stops and deletes its own cluster on success or test failure; cleanup evidence is written to `dg-slice3-db-evidence.json` in the operating system temporary directory. Never point these tests at an existing DigitalGate database.

## Revocation and rotation

Disable an organisation recipient through the approval DELETE route. Rotate with `node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/rotate-ai-local-worker.mjs <worker-id>`: install the one-time output in Keychain within the five-minute overlap, verify polling, then allow the previous credential to expire. Revoke with `node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/revoke-ai-local-worker.mjs <worker-id>`; this immediately blocks auth and future lease renewal. Do not log bearer values or include raw Ollama errors.

## Current operational prerequisites

Production key provisioning, database migration application, Mac worker provisioning, Keychain storage and launchd installation are deployment steps. No production secret is checked into this repository.
