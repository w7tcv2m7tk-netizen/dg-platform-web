# AI Gateway Slice 3 operations

## One-time setup

1. Provision `AI_JOB_ENCRYPTION_KEY_V1` as a dedicated 32-byte key encoded as 64 hex characters or unpadded base64url. Do not put it in source, a client bundle, or a Mac worker. The cloud application runtime needs this secret before local enqueue or result reads can work.
2. Apply `20261007_ai_gateway_slice3_local_routine` through the normal reviewed database migration process. This repository change does not apply it automatically.
3. Install only the approved `dg-fast:latest` deployment on the Mac. Verify its Ollama tag digest and Qwen3.5 9B Q4_K_M identity locally with `/api/tags`.
4. Provision on the intended Mac mini only, from a controlled environment with a safely injected production `DATABASE_URL`. Never copy the cloud encryption key to the Mac. Use Node >=24 and an unlocked current-user default Keychain. First build the native Security-framework helper at its stable location (source/binary contain no secrets):

   ```sh
   mkdir -p "$HOME/Library/Application Support/DigitalGate/bin"
   swiftc scripts/mac-worker-keychain.swift -o "$HOME/Library/Application Support/DigitalGate/bin/mac-worker-keychain"
   chmod 700 "$HOME/Library/Application Support/DigitalGate/bin/mac-worker-keychain"
   node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/provision-ai-local-worker-keychain.mjs provision
   ```

   The command pins `dg-mac-1`, `dg-fast:latest`, digest `bb416f08ee253472fdb015ecc32db5ad8fbf0baf76226781fb62b711835c0f7d`, `local_routine`, and `ollama_loopback`. Run only one provisioning operator/command at a time. It rejects an existing `dg-mac-1` principal before creating anything, and calls the authoritative atomic `provisionAiLocalWorker()` once. The generated credential stays in process memory and an anonymous stdin pipe; it is never an argument, environment value, file, log or printed output. The child receives no database credentials and its stdout/stderr are ignored. The native helper installs under service `com.digitalgate.ai-worker`, account exactly the generated worker ID, with default Keychain access control; existing-item updates retain their ACLs. No `-A`, ACL broadening, or password readback is used. macOS may request normal user authorization; approve only the reviewed helper. Keep this executable at its stable path and do not replace it with an untrusted binary.

   Output is an allowlist of worker/deployment IDs, pinned model identity, lane/endpoint and `keychainInstalled`. Save/share only that non-secret metadata. Exit zero plus `keychainInstalled:true` is required before moving on. These commands do not start a worker, install launchd, approve recipients or enqueue jobs. The legacy stdout provisioner/rotator are unsuitable for transcripted production operations; do not use them for this workflow.

   **Failure recovery:** a Keychain write occurs after the database transaction commits. Never rerun `provision` after a failure, timeout, interruption or ambiguous result. Inspect `dg-mac-1` records read-only first. Output retains IDs when commit returned successfully; otherwise obtain the already-created IDs through non-secret database reads. If records exist, retain them and recover the exact principal:

   ```sh
   node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/provision-ai-local-worker-keychain.mjs recover <existing-worker-id>
   ```

   Recovery validates one unrevoked `dg-mac-1` principal and one deployment with the exact pinned identity. It calls `rotateAiWorkerCredential(existingWorkerId)` once and pipes the replacement directly into the same Keychain account, preserving the existing SHA-256 hashing and five-minute previous-credential overlap. It never creates another principal or deployment. If recovery fails, stop and repair/unlock the Keychain/helper before explicitly deciding on another recovery attempt; no automatic retries occur and failed credentials are never displayed. If multiple principals or deployments are found, stop for operator investigation. The name guard is not a global uniqueness constraint: simultaneous operators on different machines are unsupported.
5. An organisation owner/admin explicitly approves that deployment with `POST /api/v1/ai/local-recipient-approvals`, choosing the highest classification the organisation permits. Revoke with `DELETE /api/v1/ai/local-recipient-approvals/{id}`. Revocation blocks new claims and prevents heartbeat/completion; it cannot recall plaintext already disclosed to a currently leased worker.
6. The secure wrapper already stores the credential in the current user's Keychain; do not retrieve it for verification. Confirm installation using its safe success output and a non-secret database read. Configure `DG_AI_GATEWAY_URL`, `DG_AI_WORKER_ID`, and `DG_FAST_OLLAMA_DIGEST` separately when worker installation is authorised. These three values are non-secret configuration. Never put the worker bearer directly in the command line, shell history, plist, source, `.env`, logs or documentation. Do not use `-A` to allow every application access. The worker captures Keychain retrieval output directly into process memory; do not run the retrieval command in a terminal where it prints the secret. The worker reads the credential once at startup.
7. Start the worker with Node 24 or newer. Install a launchd job only after the credential and pinned digest are confirmed. The worker opens no listening port and never changes the Ollama bind address.

## Machine endpoint authentication boundary

Slice 3 exempts only `/api/internal/ai-worker/claim`, `/api/internal/ai-worker/heartbeat`, `/api/internal/ai-worker/complete` and `/api/cron/ai-gateway-maintenance` from Clerk session protection. This exemption only lets the handlers perform their own machine authentication; it grants no unauthenticated operation or tenant/admin session. Worker routes require the dedicated worker bearer and retain HTTPS, revocation and lease/deployment/recipient fencing checks.

Maintenance uses the existing `authorizeCronRequest` contract: `CRON_SECRET` is mandatory; the handler accepts its exact value through `Authorization: Bearer …` or `x-cron-secret`. Vercel scheduled requests use the bearer form. `x-vercel-cron` alone is not authentication. Do not weaken this contract if cron configuration is missing. No route-family wildcard exemption is permitted.

Use only `packages/database/prisma/migrations/20261007_ai_gateway_slice3_local_routine/migration.sql`; SHA-256 `0e2376fdfb12b7b871f9dfc9177867d6fb7f674daf71a98d510d874edc19ebbc`. Do not select migration files by wildcard or use duplicate copies. This repair does not apply the migration or activate production.

## Local Keychain integration review (no database access)

Build the stable helper above with mode `700`, then run the explicit local-only test:

```sh
swiftc scripts/test-ai-worker-keychain-metadata.swift -o /tmp/dg-keychain-metadata
node scripts/test-ai-worker-keychain-integration.mjs /tmp/dg-keychain-metadata
```

This test generates two synthetic credentials entirely in memory for only `dg-keychain-integration-test`. It refuses to touch a pre-existing item. It verifies actual create/update, exact service/account, one matching item, unchanged ACLs, restricted decrypt access, empty helper stdout/stderr and actual process argv/environment. The inspector requests attributes/item references only, never password data. Cleanup uses `security delete-generic-password` with the exact disposable service/account, suppresses its metadata output, and verifies absence. No production scripts or database imports run. If interrupted, inspect only the disposable item's metadata and delete that exact item without `-g`/password readback before another test. Cleanup failures are explicit.

Memory clearing is bounded: Swift validates bytes without making a credential String/Data copy, wipes its native buffer using `memset_s` on every normal return, then exits. Node clears the anonymous-pipe buffer on settlement and drops credential references after installation; immutable strings returned by the authoritative provisioner are garbage-collected, not guaranteed zeroised. OS pipe/Security-framework internals and abrupt process termination are outside application zeroisation guarantees. Child failures settle once and terminate the helper; they never retry provisioning. The classic macOS Security APIs are deprecated but deliberately retained here for the existing default Keychain/ACL contract; the real local test verifies their current behaviour. Updating data preserves access controls rather than deleting/recreating items.

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

Disable an organisation recipient through the approval DELETE route. For the pinned `dg-mac-1` principal, rotate using the secure `recover <existing-worker-id>` command above. When worker restart is separately authorised, restart within the five-minute overlap and verify polling, then allow the previous credential to expire. Slice 3 reads the Keychain credential once at startup, so updating Keychain alone does not rotate the running process. Revoke with `node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/revoke-ai-local-worker.mjs <worker-id>`; this immediately blocks auth and future lease renewal. Do not log bearer values or include raw Ollama errors.

## Current operational prerequisites

Production key provisioning, database migration application, Mac worker provisioning, Keychain storage and launchd installation are deployment steps. No production secret is checked into this repository.
