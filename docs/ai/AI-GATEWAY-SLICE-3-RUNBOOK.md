# AI Gateway Slice 3 operations

## One-time setup

1. Provision `AI_JOB_ENCRYPTION_KEY_V1` as a dedicated 32-byte key encoded as 64 hex characters or unpadded base64url. Do not put it in source, a client bundle, or a Mac worker. The cloud application runtime needs this secret before local enqueue or result reads can work.
2. Apply `20261007_ai_gateway_slice3_local_routine` through the normal reviewed database migration process. This repository change does not apply it automatically.
3. Install only the approved `dg-fast:latest` deployment on the Mac. Verify its Ollama tag digest and Qwen3.5 9B Q4_K_M identity locally with `/api/tags`.
4. Provision only after the separately authorised cloud boundary rollout below. The Mac must never receive Production `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, database passwords or the cloud encryption key. The secure wrapper now uses a signed request to exactly `https://app.digitalgate.com.au/api/internal/ai-worker/provisioning`; it does not import Prisma or load Vercel environment variables. It rejects redirects, bounds responses, verifies the returned identity and never automatically retries. Use Node >=24 and an unlocked current-user Keychain.

   ```sh
   node scripts/provision-ai-local-worker-keychain.mjs provision
   ```

   Server pins `dg-mac-1`, `dg-fast:latest`, digest `bb416f08ee253472fdb015ecc32db5ad8fbf0baf76226781fb62b711835c0f7d`, `local_routine`, and `ollama_loopback`. The transaction requires zero workers/deployments/approvals/jobs before creation. A PostgreSQL advisory lock serializes requests, a partial unique index fences duplicate pinned workers even from other writers, and dedicated durable security receipts enforce nonce consumption, cooldown and window budget. No tenant/session/API-key/cron/worker credential can authorize this operation.

   A successful HTTPS response is the only cloud plaintext delivery. The Node response allocation is bounded to 2048 bytes and wiped; the worker credential then travels through the existing anonymous stdin pipe to the native password installer. Service is `com.digitalgate.ai-worker`, account exactly the generated worker ID. Child receives only HOME/PATH and its output is ignored. Default Keychain ACLs remain restricted; updates preserve ACLs. Never use `-A`, retrieve the password for verification, or put credentials in files, argv, environment variables, evidence or logs.

   Safe output includes only pinned identity, request/worker/deployment IDs and `keychainInstalled`. Exit zero and `keychainInstalled:true` are mandatory. Run one operator at a time. The legacy plaintext stdout provisioner/rotator are unsuitable for this workflow.

   **Ambiguous result or Keychain failure:** STOP. Never rerun provision or automatically retry recover. Use independent non-secret Production reads to inspect the safe request ID in `ai_worker_provisioning_receipts` and the `dg-mac-1` principal/deployment. A response may be lost after commit. The receipt retains no credential and cannot replay the successful response. If records exist, retain their IDs; repair/unlock local Keychain first, wait for the cooldown, then explicitly authorise recovery of that exact principal:

   ```sh
   node scripts/provision-ai-local-worker-keychain.mjs recover <existing-worker-id>
   ```

   Recovery requires the unique unrevoked pinned principal and exactly one active matching deployment. It calls the authoritative rotator inside the same locked transaction, preserves SHA-256 hashing and five-minute previous-credential overlap, and never creates records. Inspect any failed/ambiguous recovery before another explicitly authorised operation. A window that exhausted its budget requires a deliberate privileged new window; do not bypass the guard.

5. An organisation owner/admin explicitly approves that deployment with `POST /api/v1/ai/local-recipient-approvals`, choosing the highest classification the organisation permits. Revoke with `DELETE /api/v1/ai/local-recipient-approvals/{id}`. Revocation blocks new claims and prevents heartbeat/completion; it cannot recall plaintext already disclosed to a currently leased worker.
6. The secure wrapper already stores the credential in the current user's Keychain; do not retrieve it for verification. Confirm installation using its safe success output and a non-secret database read. Configure `DG_AI_GATEWAY_URL`, `DG_AI_WORKER_ID`, and `DG_FAST_OLLAMA_DIGEST` separately when worker installation is authorised. These three values are non-secret configuration. Never put the worker bearer directly in the command line, shell history, plist, source, `.env`, logs or documentation. Do not use `-A` to allow every application access. The worker captures Keychain retrieval output directly into process memory; do not run the retrieval command in a terminal where it prints the secret. The worker reads the credential once at startup.
7. Start the worker with Node 24 or newer. Install a launchd job only after the credential and pinned digest are confirmed. The worker opens no listening port and never changes the Ollama bind address.

## Machine endpoint authentication boundary

Slice 3 exempts only `/api/internal/ai-worker/claim`, `/api/internal/ai-worker/heartbeat`, `/api/internal/ai-worker/complete` and `/api/cron/ai-gateway-maintenance` from Clerk session protection. This exemption only lets the handlers perform their own machine authentication; it grants no unauthenticated operation or tenant/admin session. Worker routes require the dedicated worker bearer and retain HTTPS, revocation and lease/deployment/recipient fencing checks.

Maintenance uses the existing `authorizeCronRequest` contract: `CRON_SECRET` is mandatory; the handler accepts its exact value through `Authorization: Bearer …` or `x-cron-secret`. Vercel scheduled requests use the bearer form. `x-vercel-cron` alone is not authentication. Do not weaken this contract if cron configuration is missing. No route-family wildcard exemption is permitted.

Use only `packages/database/prisma/migrations/20261007_ai_gateway_slice3_local_routine/migration.sql`; SHA-256 `0e2376fdfb12b7b871f9dfc9177867d6fb7f674daf71a98d510d874edc19ebbc`. Do not select migration files by wildcard or use duplicate copies. This repair does not apply the migration or activate production.

## Signed provisioning boundary rollout (separate Production authorisation required)

PR/build/testing does not run these Production steps. Code deployment alone leaves the endpoint disabled. Database migration, real signing-identity creation, public-key registration and activation window configuration each require explicit operational authorisation.

1. Apply only the reviewed new migration `20261007_ai_worker_provisioning_boundary` through the normal migration process. It adds the dedicated `ai_worker_provisioning_receipts` security ledger and a partial unique index for `dg-mac-1`. It does not create a worker/deployment or alter the historical Slice 3 migration. Do not overload business audit rows as replay state. Receipts record accepted attempts/outcomes, fingerprint, nonce/request ID, window ID, operation, optional record IDs and timestamps—never bodies, signatures, credentials or hashes/prefixes of worker credentials. Retain receipts; never clear active-window replay/budget state.
2. Build both helpers once at stable paths with mode 700; ensure their directory is owned by the current user and not group/world writable. Do not replace trusted helpers while identities exist without a separate review of Keychain access prompts.

   ```sh
   mkdir -p "$HOME/Library/Application Support/DigitalGate/bin"
   swiftc scripts/mac-worker-keychain.swift -o "$HOME/Library/Application Support/DigitalGate/bin/mac-worker-keychain"
   swiftc scripts/mac-worker-provisioning-sign.swift -o "$HOME/Library/Application Support/DigitalGate/bin/mac-worker-provisioning-sign"
   chmod 700 "$HOME/Library/Application Support/DigitalGate/bin/mac-worker-keychain" "$HOME/Library/Application Support/DigitalGate/bin/mac-worker-provisioning-sign"
   ```

3. Only after authorisation, run the native helper's `create dg-mac-1` mode. It generates a permanent P-256 private key directly in the current user's default macOS Keychain, application tag `com.digitalgate.ai-worker.provisioning.dg-mac-1`, with extractability false at both top-level and private-key attributes. It refuses replacement. Its output is only the public 65-byte X9.63 key encoded as unpadded base64url. No private-key export API runs for the real identity. Default Keychain ACLs are retained; do not broaden them. Node signs by asking this helper to sign bounded protocol messages over stdin and receives only public signatures.
4. A privileged Vercel operator manually registers these **Production-only Config values**, without changing any existing database/encryption variables:
   * `AI_WORKER_PROVISIONING_PUBLIC_KEY`: the public base64url X9.63 key.
   * `AI_WORKER_PROVISIONING_FINGERPRINT`: lowercase SHA-256 hex of decoded public key bytes.
   * `AI_WORKER_PROVISIONING_WINDOW_ID`: fresh 16 random bytes encoded as 32 lowercase hex characters (public identifier).
   * `AI_WORKER_PROVISIONING_START` and `AI_WORKER_PROVISIONING_END`: UTC ISO timestamps, at most 15 minutes apart.
   * `AI_WORKER_PROVISIONING_ENABLED`: exactly `true` for the separately authorised window; normal state is absent or `false`.

   Public-key configuration is not a secret, but changing it grants this narrow provisioning authority and is privileged. Missing, malformed, expired or non-Production configuration fails closed. Runtime also requires the existing production Neon endpoint `ep-bold-tree-a7bny92m`, database `neondb`, role `neondb_owner`, declared Production and TLS. No DB URL/password leaves Vercel. Reverify project `gentle-sky-35028642`, branch `br-old-shadow-a7ffezls` and baseline independently before enabling. Environment updates require the normal Production deployment/readiness checks.
5. Signed protocol v1 binds fixed HTTPS origin, POST, exact path, operation, SHA-256 of raw bounded body, timestamp and 32-byte random nonce. Server tolerates 30 seconds clock skew and rechecks time after acquiring its transaction lock. Keep Mac clock synchronized. Each window allows at most three accepted authenticated attempts, at least 60 seconds apart; failed mutations consume a nonce and attempt too. Unauthenticated failures never write untrusted identity/body into the ledger. Fixed sanitized attempt/outcome events cover denied and accepted requests without raw headers or errors.
6. After separately authorised provisioning/recovery is verified, set `AI_WORKER_PROVISIONING_ENABLED=false` and redeploy normally. Expiry independently closes the window. Removing/replacing the public-key registration revokes its future narrow authority. This identity has no operator, tenant, worker-runtime, CRM, tools or communications authority.

## Local Keychain integration review (no database access)

Build the stable helper above with mode `700`, then run the explicit local-only test:

```sh
swiftc scripts/test-ai-worker-keychain-metadata.swift -o /tmp/dg-keychain-metadata
node scripts/test-ai-worker-keychain-integration.mjs /tmp/dg-keychain-metadata
node scripts/test-ai-worker-provisioning-keychain.mjs /tmp/dg-keychain-metadata
```

The password regression test generates two synthetic credentials entirely in memory for only `dg-keychain-integration-test`. It refuses to touch a pre-existing item. It verifies actual create/update, exact service/account, one matching item, unchanged ACLs, restricted decrypt access, empty helper stdout/stderr and actual process argv/environment. The inspector requests attributes/item references only, never password data. Cleanup uses `security delete-generic-password` with the exact disposable service/account, suppresses its metadata output, and verifies absence. No production scripts or database imports run. If interrupted, inspect only the disposable item's metadata and delete that exact item without `-g`/password readback before another test. Cleanup failures are explicit.

The signed-path test creates only `dg-provisioning-integration-test`, proves the private-key export API refuses it, checks one exact Keychain tag, signs/cryptographically verifies protocol messages and inspects actual argv/environment. It then feeds a synthetic simulated HTTPS success through the real wrapper buffer/pipe/password installer, verifies non-secret item metadata, and removes both disposable identities. It never contacts Production. If interrupted, remove only the disposable signing identity with `mac-worker-provisioning-sign test-remove dg-provisioning-integration-test`; this mode refuses the real identity.

Memory clearing is bounded: Swift validates bytes without making a credential String/Data copy, wipes its native buffer using `memset_s` on every normal return, then exits. The signing private key stays behind a native Keychain SecKey reference and is never exported to Node. Node clears the bounded HTTPS buffer and anonymous-pipe buffer on settlement and drops credential references after installation; immutable strings returned by the authoritative provisioner are garbage-collected, not guaranteed zeroised. OS pipe/Security-framework internals and abrupt process termination are outside application zeroisation guarantees. Child failures settle once and terminate the helper; they never retry provisioning. The classic macOS Security APIs are deprecated but deliberately retained here for the existing default Keychain/ACL contract; the real local test verifies their current behaviour. Updating data preserves access controls rather than deleting/recreating items.

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

Set `PG_BIN` to the actual installed PostgreSQL 18 binary directory on your machine. The runner installs nothing, ignores inherited database and libpq connection settings, creates a fresh `dg-slice3-pg-*` cluster in the operating system temporary directory on a random non-default `127.0.0.1` port, and verifies a per-cluster nonce before test mutations. Historical migrations have no empty-database baseline, so it materializes the pinned Slice 2 Prisma schema at commit `7301af172417c07773db935f6e10b7c7dc7fd937`, then applies the exact Slice 3 SQL migration and the dedicated provisioning-boundary migration. All fixtures are synthetic. Real PostgreSQL row locks and advisory barriers establish completion races. The runner stops and deletes its own cluster on success or test failure; cleanup evidence is written to `dg-slice3-db-evidence.json` in the operating system temporary directory. Never point these tests at an existing DigitalGate database.

## Revocation and rotation

Disable an organisation recipient through the approval DELETE route. For the pinned `dg-mac-1` principal, rotate using the secure `recover <existing-worker-id>` command above. When worker restart is separately authorised, restart within the five-minute overlap and verify polling, then allow the previous credential to expire. Slice 3 reads the Keychain credential once at startup, so updating Keychain alone does not rotate the running process. Revocation remains a separate authorised administrative operation; this PR does not add a revocation endpoint. Do not run the legacy direct-DB revoke script on the Mac or supply it Production database credentials. Do not log bearer values or include raw Ollama errors.

## Current operational prerequisites

Production key provisioning, database migration application, Mac worker provisioning, Keychain storage and launchd installation are deployment steps. No production secret is checked into this repository.
