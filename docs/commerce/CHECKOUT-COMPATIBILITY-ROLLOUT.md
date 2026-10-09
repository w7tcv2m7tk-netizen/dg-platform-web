# Commercial checkout compatibility gate

Status: development/review only. **HOLD production rollout.** No production
migration, gate activation, Stripe call, deployment or data modification was
performed during development. PR #1006 is unchanged. This release branches from
main at `331b96e1`, independently of the persistent coordinator.

## Architecture and scope

`billing/platform-checkout.ts` contains the existing standard and custom-offer
subscription creators, extracted without changing pricing, trials, metadata or
entitlements. Billing POST and Gen2 onboarding POST import it directly. Custom
offer aliases also use this implementation. A `server-only` boundary keeps the
barrier and creators out of browser bundles. The platform-core barrel retains
parsing, portal and webhook functions, but does not export subscription creators.
Connect commerce's payment-mode checkout and the billing portal are separate.

Immediately before each Stripe session create, `admitPlatformCheckout` performs
one autocommitted PostgreSQL UPDATE against singleton row 1. The UPDATE succeeds
only when `blocked = false`; it records an absolute expiry in
`last_admission_expires_at` before returning. Missing table/row, database errors,
unknown commit outcomes and a closed gate all fail closed with HTTP 503,
`checkout_temporarily_unavailable`, Retry-After 60, and a customer-safe message.
No cache, browser state, environment flag or per-process authority is involved.

Admission and operator closure lock the same row, serializing across instances.
The permit supplies `expires_at` to Stripe, fixed to the maximum recorded
admission expiry, normally database time plus 35 minutes. Stripe's installed SDK
contract permits absolute expiry between 30 minutes and 24 hours from creation.
A worker delayed beyond the permitted creation window fails rather than getting
a fresh expiry; SDK retries reuse the same body. Closure cannot undo requests
already admitted. The recorded horizon survives crashes, lost provider responses
and database commit uncertainty. Do not clear it on close/open. Wait until database
time exceeds that horizon by 60 seconds, then inspect actual Stripe statuses.
A future timestamp caused by clock movement lengthens the hold; never shorten it.
Database and provider clock accuracy must be checked operationally.

This compatibility release does **not** coordinate or deduplicate purchases while
open. Opening it before #1006 retains legacy duplicate-session risks. Its purpose
is to establish a verifiable closed transition. It never expires a session,
invalidates an existing Stripe URL, or changes webhook authority. Existing URLs
can complete during the hold; webhook processing must stay available.

The additive `20261009_platform_checkout_creation_gate` migration creates only
one new table, its checks, and one initially **closed** singleton. It has no
coordinator dependency. Application DB role needs SELECT and UPDATE on this table;
only the approved migration/operator role should insert/delete it or control
release state. The application writes only the admission horizon. Control state
changes are explicitly approved operator SQL, not a customer/admin HTTP endpoint.

## Read-only legacy inventory

The report is an explicit CLI, never a startup hook or customer route. It loads no
dotenv files. Supply a dedicated read-only database role (SELECT on organisations,
platform_subscriptions and the gate) in `RECONCILIATION_DATABASE_URL`, and a
restricted Stripe read-only key in `STRIPE_RECONCILIATION_SECRET_KEY`. Do not paste
credentials into commands, reports or review comments. Every report database read
also runs in a PostgreSQL READ ONLY transaction. The report makes only account,
balance, Checkout Session list/retrieve and Subscription retrieve calls.

After separate authorization, with secrets injected through the approved secret
manager, invoke:

```sh
npm run checkout:inventory -- --account acct_EXPECTED --mode live --max-pages 20 > checkout-inventory.json
```

Use `--mode test` for an isolated sandbox. The CLI verifies account ID and balance
livemode, then walks the **entire account** in 100-session pages, with no customer,
status or created-time filter. No customer is required for an open session. Each
marked platform session is retrieved again, with actual status and expires_at.
Metadata `dg_platform_checkout=true` and `organisation_id` must resolve to an
existing organisation. Customer conflicts block confidence. Completed purchases
must match the provider subscription, its organisation/customer/mode and the exact
canonical subscription/customer/raw-status projection. No projection is written.

Unmarked subscription sessions, unknown ownership, unknown statuses, missing
subscriptions, provider/database failures, duplicate/invalid pagination and page
or time limits fail closed. An open session remains a blocker even if the local
clock says it should have expired. There is no automatic expiry or unlock.

The scan has a 120-second processing deadline, checked between calls; CLI provider
calls have a 10-second timeout and no retries. Thus a slow final call may finish
up to its timeout after the processing deadline. Max pages is 1–1000 (default
20); increase only through reviewed invocation. Exit 0 means confident inventory;
exit 1 means HOLD; exit 2 means invalid invocation. Reports contain counts,
statuses, actual expiry, hash references and generic blocker codes, never emails,
business names, raw metadata, checkout URLs, raw errors or credentials. Hashes are
correlation references, not session IDs accepted by any mutation tool.

Both initial and final gate reads must show the same closed revision and admission
horizon. Database time must exceed the admission horizon by 60 seconds. A clean
report can establish inventory confidence **only with external proof that all
ungated producers were isolated before the drain**. It always returns
`readyForCoordinator=false` because it cannot prove deployment isolation, inspect
unreachable Stripe accounts, or approve a release. Historical completed sessions
whose older subscription was superseded by another canonical record will conservatively
block; investigate with read-only evidence and obtain a separately reviewed resolution.
There is no exclusion/override flag. No real inventory was run during development;
production inventory confidence is currently **not established**.

## Proposed production procedure — separate approval required

All commands below are a proposed runbook, not executed authorization. Assign an
operator and reviewer; record exact project/team, database branch, Stripe account,
mode, migration checksum and commit SHA. Preserve the current migration history;
do not use `db push`, bulk `migrate deploy`, reconciliation tools or other pending
migrations to install just this gate. The repository has no checked-in automatic
migration workflow; `db:push` is a development convenience, not this procedure.

1. **Isolate legacy ingress first.** Enumerate every production/custom domain,
   branch alias, immutable deployment URL, preview with live credentials, rewrite,
   rollback target, background producer and connected project that can call either
   subscription creator. Freeze automatic promotions/rollback and restrict deploy
   permissions for the change window. Apply an independently verified project-wide
   ingress deny for POST to `/api/v1/billing/checkout` and
   `/api/v1/onboarding/gen2` (including trailing-slash/rewritten equivalents).
   Vercel WAF is a proposed control; verify its actual plan, host/environment scope,
   rule priority and custom bypasses before relying on it. A primary-domain-only
   deny, DNS change or alias promotion is insufficient. Probe every reachable old
   URL with an authorized request and confirm the deny executes before application
   code. Do not block `/api/webhooks/stripe`, GET/PATCH onboarding, portals or Stripe
   hosted checkout URLs. If universal coverage cannot be proved, STOP/HOLD and
   isolate/decommission the uncovered deployment by a separately approved mechanism.
   Record the last possible ungated admission time as T0.
2. **Drain old execution.** Verify maximum execution duration and every retry,
   queue, waitUntil or delayed-work path of old deployments. Wait for all ungated
   workers to terminate; record completion as T1. This implementation's old
   creators have no queue, but this must also hold for every reachable historical
   deployment. A fixed guess such as 60 seconds is insufficient. For legacy SDK
   requests with no absolute expiry, preserve a full 24-hour session creation
   horizon after T1, plus at least 60 seconds clock margin, unless a complete
   provider inventory and execution evidence establish a stricter safe bound.
   Keep webhooks and existing Stripe URLs working throughout.
3. **Install only the gate migration.** Using the approved DB operator connection,
   run this exact SQL file atomically and register **only this migration** in the
   approved migration history process:

   ```sh
   psql "$APPROVED_DATABASE_URL" -X -v ON_ERROR_STOP=1 --single-transaction \
     -f packages/database/prisma/migrations/20261009_platform_checkout_creation_gate/migration.sql
   ```

   `APPROVED_DATABASE_URL` must come from the secret manager; never print it. Verify
   table constraints and the single row (`id=1`, `blocked=true`, revision 0).
   Register the verified SQL with the existing Prisma migration mechanism:

   ```sh
   DATABASE_URL="$APPROVED_DATABASE_URL" npx prisma migrate resolve \
     --applied 20261009_platform_checkout_creation_gate --schema packages/database/prisma
   ```

   Verify Prisma history and schema parity without executing unrelated pending
   migrations. Do not mark the migration applied until its physical SQL is proven.
4. **Deploy the compatibility release, still closed.** Stage the reviewed production
   artifact with the gate migration already present; test against an isolated
   sandbox before production. Promote only after separate release approval.
   Maintain ingress isolation until every reachable checkout producer is compatible
   or permanently denied. Test gate denial on each admitted compatibility URL;
   expect 503 with Retry-After and no provider create. Confirm webhook receipt and
   completed-purchase projection health. The compatibility release can be deployed
   independently of #1006; it starts with checkout closed. Do not reopen it simply
   to test live session creation.
5. **Close/verify the shared gate and drain compatible requests.** For an already
   open compatibility installation, use the following approved control transaction:

   ```sql
   BEGIN;
   SET LOCAL lock_timeout = '10s';
   UPDATE platform_checkout_creation_gate
   SET blocked = true, revision = revision + 1, changed_at = clock_timestamp()
   WHERE id = 1
   RETURNING blocked, revision, changed_at, last_admission_expires_at;
   COMMIT;
   ```

   Require exactly one returned row and a successful commit; a timeout or missing
   row is a HOLD. Do not reset the horizon. Wait for database time to exceed
   `last_admission_expires_at + interval '60 seconds'`, and for the legacy T1 bound
   in step 2. NULL horizon means no compatible admission, not no legacy sessions.
6. **Reconcile and protect purchases.** Run the read-only inventory against the
   independently verified account/mode. Require all pages, no open sessions, no
   unknown ownership/unclassified subscriptions and no unconfirmed completed
   purchases. For open sessions, let their actual Stripe expiry elapse naturally;
   rescan. For complete sessions, let existing webhook retries confirm purchases;
   investigate failures read-only. Do not delete attempts, expire sessions or
   modify entitlements to force a clean report. Preserve a final clean report
   tied to the closed revision, deployment inventory, T0/T1 and migration evidence.
7. **Prepare the coordinator separately.** #1006 must receive a separately reviewed
   follow-up/rebase integrating this same database admission gate **before every
   provider create/replay**. Its current code does not consult this table. Also
   review how its immutable replay expiry participates in the drain bound. This
   compatibility PR intentionally leaves #1006 untouched. Until that integration
   and tests exist, HOLD coordinator traffic. Apply only the approved coordinator
   migration after compatibility is proven and the inventory is clean; verify
   parity and history. No deployment dependency cycle exists: compatibility is
   already independently installed and all old code is isolated.
8. **Stage/promote integrated coordinator while closed.** Require full focused,
   PostgreSQL, billing/onboarding, security, type, lint, build and bundle-boundary
   checks on the integrated artifact. Prove no uncoordinated compatibility creator
   can still receive traffic **before reopening**. Merely sharing a gate does not
   deduplicate legacy creators when open. Restrict rollback targets to a closed
   compatible release or the integrated coordinator. Retain selective ingress
   denial on every old URL; remove a temporary universal deny only when it exposes
   compatible/integrated code exclusively. Verify completed purchase/webhook
   projections throughout.
9. **Re-enable only after approved evidence review.** With all steps proven and
   separate explicit approval, use this transaction and require exactly one row:

   ```sql
   BEGIN;
   SET LOCAL lock_timeout = '10s';
   UPDATE platform_checkout_creation_gate
   SET blocked = false, revision = revision + 1, changed_at = clock_timestamp()
   WHERE id = 1 AND blocked = true
   RETURNING blocked, revision, changed_at, last_admission_expires_at;
   COMMIT;
   ```

   Keep the horizon intact. Verify the intended integrated coordinator is the sole
   reachable producer, then monitor its checkout attempts and webhook processing.

## Rollback and blockers

On failure, close the shared gate first, retain/restore ingress denial, preserve all
admission horizons and checkout attempts, and keep webhooks running. Drain already
admitted work and rerun inventory. Roll back only to a compatible closed artifact;
never to ungated code, never drop the gate or coordinator table, never release
reservation slots/delete history, and never reopen a legacy creator alongside the
coordinator. Routing to old code is not safe merely because the new gate is closed.
If a failed integrated release ignores the gate, ingress isolation is mandatory.

Current recommendation: **HOLD production merge/release activation**, pending an
independently reviewed compatibility release, verified ingress isolation and
in-flight bounds, approved migration execution, real restricted-key sandbox
permission tests, a complete read-only inventory, and the separately reviewed
#1006 gate integration. The compatibility code is independently reviewable and
schema-additive; simulated tests cannot certify live permissions or topology.

The report key requires account and balance read, Checkout Session list/retrieve
and Subscription retrieve only. It needs no create/expire permission. Existing
application checkout credentials retain their current requirements; neither key
nor Stripe settings were modified in this PR.

`vercel.json` disables automatic deployment for
`work/commercial-checkout-compatibility` only, to keep this review push from
creating a preview. Unspecified branches retain their existing behavior. This
repository rule does not change the live Vercel project settings. See
[Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration).

## Local verification

```sh
npm ci --ignore-scripts --offline
npm run db:generate
npm run test:checkout-compatibility
npm run test:checkout-compatibility-db -- /absolute/path/to/postgresql/bin
npm run prebuild
npx tsc --noEmit
npx eslint <changed TS/JS files>
npx next build
npm run test:checkout-compatibility-artifacts
```

The disposable runner clears inherited database and Stripe variables, checks a
cluster nonce before any mutation, materializes pinned main schema `331b96e1`,
applies the exact gate SQL, verifies schema parity and destroys its localhost
cluster. Its Stripe methods are simulated; no network calls are made.

Development results on 2026-10-09: 33 focused tests, 16 disposable PostgreSQL
behavioural tests, 46 security tests and the full `npm run prebuild` pipeline
passed. The exact gate migration applied over the pinned main schema and Prisma
schema parity reported no differences; the cluster stopped and was destroyed.
TypeScript and focused ESLint passed. Standard Turbopack `npx next build` completed
with its final route summary, and the actual browser/server artifact check passed.
The build retains existing Prisma CommonJS export, file-tracing, cache-header and
middleware-deprecation warnings. The first sandboxed build stalled and was stopped;
the successful retry ran locally with process permissions. Logs are in
`/private/tmp/dg-compat-*.log`; the DB runner writes `dg-compat-db-evidence.json`
under Node's operating-system temporary directory. No production credentials were
loaded for these checks.
