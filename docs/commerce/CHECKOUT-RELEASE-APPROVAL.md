# Controlled checkout release approval package

Prepared 21 October 2026. Requirements: `platform.auth`, `detach.portal_billing`,
`crm.companies`. This is the executable approval proposal, not permission to run
Production operations. No Production change was performed while preparing it.

## Decision and exact sources

GO for committing the reviewed local completion delta and submitting this package.
HOLD for Production execution and customer invitations until the numbered approvals
below. No confirmed local P0/P1 remains in the reviewed delta. Production routing,
live catalogue/configuration and recovery readiness are window-specific acceptance
conditions, not facts established by localhost tests.

Application source: `finish/checkout-entitlements`, completion commit
`89b26ba0d0ab293075eb4d2bd8922d6749af6dad` (parent
`b1d08a0de540648a65c194d0b54dddb75296c1d8`). The following package commit is
documentation-only. Use the final reported release HEAD, never an uncommitted directory.

Read-only GitHub observation on 21 October: all three PRs are open/draft with no
check runs. #1016 -> main is `d5c9f30a6e1fa010939b1f155abe309becdd6fe6`;
#1006 -> main is `27a2ae80a785febea592f2b41926b626821a1c24`;
#1015 -> work/commercial-readiness is `b1d08a0de540648a65c194d0b54dddb75296c1d8`.
#1015 is mergeable; #1016 is mergeable; #1006 returned UNKNOWN. Recheck after each
base update. The combined candidate already contains both coordinator and guard
heads as ancestors. Do not recreate them or force-push their histories.

Migration source is the separately certified, clean recovery worktree
`/private/tmp/dg-migration-recovery-20261019` at
`af85b034f854c8e9ff9a66890a9607f85503cca3`. Its complete **24-directory** tree and
frozen `docs/billing/PRODUCTION-MIGRATION-EXECUTION-MANIFEST.md` govern execution.
The application worktree has 22 migration directories and MUST NOT be substituted
as the migration runner. Preserve the recovery commit and guard-only PR unchanged.
All 22 common migration SQL files must match the recovery tree byte-for-byte.
Future normal deployment migration jobs must use the canonical recovered tree;
integrating that separately reviewed recovery branch is a distinct release task,
not permission to copy, delete or rewrite historical migrations in the guard PR.

## Validation and independent review evidence

- Synthetic mortgage and cleaning acceptance: 22/22, actual Clerk Development
  authentication, hosted Stripe sandbox Checkout, temporary CLI signed delivery,
  exact 14-day trial, canonical purchases, onboarding and app/dashboard access.
- Mortgage selection: AUD 249 Growth + 149 Finance = 398 monthly. Cleaning:
  AUD 499 Scale + 499 Growth Suite/Services = 998 monthly. Selections are not
  contracts; both customers must confirm their complete current standard basket.
- Duplicate reuse, signed expiry/replacement and unpaid-app rejection passed.
  Hold/release duplicate replay used actual event payloads re-signed locally;
  this is not evidence of Stripe's hosted resend operation.
- 67/67 pairing/local certification security checks; TypeScript and whitespace PASS.
- Existing affected disposable evidence reused: checkout/lifecycle 126/126,
  legacy reconciliation 27/27, atomic concurrency 6/6, drain 7/7.
- Fresh full `npm run build` (prebuild included), Next.js 16.2.12, canonical
  Webpack: exit 0, 456/456 page generation, 78 seconds. No bundler/lockfile changes.
- Independent focused read-only reviewer: PASS, no P0/P1 in seven-path delta;
  normal Production/Preview restrictions and canonical billing logic unchanged.
- Independent runbook review found one executable P1: bare Node drain invocation
  could not resolve the workspace import. Corrected to the checked-in resolver.
  A credential-free module-load check passed with seven normalized event classes
  and no database connection. No other material runbook corrections were found.
- Evidence: `Verification/Checkout-Certification-20261018/local-provider-20261021/`.
  `report.json` SHA-256:
  `78c6feade32d5be5b74be0cb60bd94dac505443c0713637ada9477110f7f23d9`.
  Build SHA-256:
  `d55b00286352dff3af473f8b3d7607a8a6b8a678639d1c87674111623de2a27d`.
  Credential-free copies and remaining hashes are in its `sha256.json`.

## 1. Publication and dependency approval

No push is included in the current task. After separate publication approval,
normal-fast-forward the completion commits to the existing #1015 head branch:

```sh
git status --porcelain  # must be empty
git ls-remote origin refs/heads/release/checkout-entitlements-20261019
# Must still equal b1d08a0de540648a65c194d0b54dddb75296c1d8.
git merge-base --is-ancestor b1d08a0de540648a65c194d0b54dddb75296c1d8 HEAD
# Reconfirm automatic Preview suppression and independent Neon workflows first.
git push origin HEAD:refs/heads/release/checkout-entitlements-20261019
```

Never force-push. Verify the new remote/PR SHA, checks, review requirements and no
Preview/provisioning. Retain existing branch suppression. The local `finish/*`
branch need not be published. Any unexpected hosted activity: stop, no deletion.

Approved integration order: recovery source (database-only execution tool), guard
#1016, coordinator #1006 with guard preserved, then #1015. After #1016 lands,
reconcile #1006 with exact main in its owning worktree, review conflict resolutions
and test only affected behavior. #1015 must retain the guard during base updates.
Do not merge #1015 early or squash away the dependency evidence. No-check-runs is
not CI PASS: inspect required checks/rules and accept local evidence explicitly or
approve a safe existing CI invocation. Each merge/deployment requires approval.

## 2. Recovery and read-only preflight approval conditions

Target: Neon project `gentle-sky-35028642`, protected branch
`br-old-shadow-a7ffezls`. Expected direct endpoint:
`ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech`; pooled endpoint has `-pooler`.
Current serving deployment and immutable source must be reverified at the window;
do not use the historical Production SHA as a current runtime attestation.

Operator must capture snapshot inventory for `snap-wispy-bird-a7537u6y`, source,
completion and expiry, current branch/compute identity, a schema-only catalog and
full migration ledger/checksums. The 20 October snapshot is dated evidence, not
automatically a sufficient new recovery point. If freshness/RPO is unacceptable,
request separate approval for a fresh snapshot; never create one implicitly.

Confirm a named recovery owner, maximum downtime/RPO, access to restore a candidate
and all connection/integration updates. Candidate restore can be inspected before
cutover and has a different branch ID. Switching computes/connections may restart
compute and interrupt service. Post-snapshot writes are absent, never auto-merged.
Direct protected-branch finalization remains unproven and cannot be the sole recovery
plan. A restore, new compute/branch or connection change requires separate approval.
If candidate cutover cannot be supported within the approved recovery envelope, stop.

Compare the live ledger/catalog to the frozen manifest, not old counts. Expected
captured state was 13 finished, four baselines + one manual reconciliation + six
deploy entries absent. A different state needs an exact reviewed residual plan;
do not rerun DDL or resolve already-recorded migrations blindly. Recheck Stripe
duplicate groups, exact index definitions, Aida constraints/defaults, catalog drift,
active connections/lock waits and six exemption identity/status values privately.
Record aggregates publicly, never customer identifiers/credentials. Capture existing
open/legacy Stripe sessions and their expiry/recovery disposition; a closed new
gate does not revoke previously issued sessions or constrain pre-gate binaries.

## 3. Proposed Production migration writes — separate approval

The following commands are NOT executed here. Use a protected operator shell with
tracing off. Inject `PROD_DIRECT_URL` securely; never paste its value into a command,
report or terminal output. Use the recovery worktree's existing pinned Prisma binary.

```sh
set -eu
set +x
cd /private/tmp/dg-migration-recovery-20261019
test "$(git rev-parse HEAD)" = af85b034f854c8e9ff9a66890a9607f85503cca3
test -z "$(git status --porcelain)"
test "$(find packages/database/prisma/migrations -name migration.sql | wc -l | tr -d ' ')" = 24
test -n "${PROD_DIRECT_URL:?secure direct target required}"
export DATABASE_URL="$PROD_DIRECT_URL"
export PGDATABASE="$PROD_DIRECT_URL"  # psql reads the target from environment
export PGOPTIONS='-c lock_timeout=5s -c statement_timeout=60s'
PRISMA=./node_modules/.bin/prisma
test -x "$PRISMA"

# READ ONLY: requires exact reviewed ledger/catalog and backup sign-off first.
"$PRISMA" migrate status --schema packages/database/prisma
# Pending migrations make this status command nonzero; inspect it separately,
# then enter the write commands below only after explicit approval.
```

Each next step is a write and has a verification checkpoint before the next step.
Run individually; do not paste as an unattended batch. Stop on any error/timeout.

```sh
# 1: baseline equivalence only, after independently signed object parity.
"$PRISMA" migrate resolve --schema packages/database/prisma --applied 20260805_legacy_schema_baseline
# 2: real transactional Stripe DDL; includes execution-time duplicates and locks.
psql -X -v ON_ERROR_STOP=1 -f packages/database/prisma/baseline/proposed/20260901_stripe_connect_tenant_trust_transaction.sql
# Verify exact four unique indexes, legacy index removal and zero duplicates.
"$PRISMA" migrate resolve --schema packages/database/prisma --applied 20260901_stripe_connect_tenant_trust
# 3: existing exact schema, not a claim that historical SQL originally ran.
"$PRISMA" migrate resolve --schema packages/database/prisma --applied 20260904_business_brain_knowledge
# 4: guarded Aida repair; verify data and exact keys/indexes/defaults afterward.
psql -X -v ON_ERROR_STOP=1 -f packages/database/prisma/migrations/20261020_aida_conversation_schema_alignment/migration.sql
"$PRISMA" migrate resolve --schema packages/database/prisma --applied 20260910_aida_public_conversations
# 5: exact existing schema baseline.
"$PRISMA" migrate resolve --schema packages/database/prisma --applied 20260913_ai_visibility_intelligence
# 6: only after status proves precisely this six-entry pending allowlist:
# 20261008_prospect_report_snapshot
# 20261009_platform_checkout_attempt
# 20261009_platform_checkout_creation_gate
# 20261018_platform_subscription_app_entitlements
# 20261019_platform_subscription_webhook_hold
# 20261020_aida_conversation_schema_alignment (safe second application)
"$PRISMA" migrate deploy --schema packages/database/prisma
"$PRISMA" migrate status --schema packages/database/prisma
```

Full checksums, object postconditions and stop conditions remain in the frozen
recovery manifest. Require all 24 successful/checksum-matching ledger entries, no
failed/in-progress rows, exact catalog, unchanged status/exemption values and:

```sql
SELECT id, blocked, revision, subscription_webhooks_held,
       last_admission_expires_at FROM platform_checkout_creation_gate;
-- Exactly id=1, blocked=true, subscription_webhooks_held=false.
SELECT status, entitlement, platform_exempt, count(*)
FROM platform_subscriptions GROUP BY status, entitlement, platform_exempt;
SELECT migration_name, checksum, finished_at, rolled_back_at
FROM _prisma_migrations ORDER BY migration_name;
```

No purchase arrays are populated from editable profiles. Empty new arrays do not
authorize app access. New gates must not run until approved purchase reconciliation.
Timeouts/connection loss require catalog and ledger reinspection; never mark failed
DDL applied or continue automatically. Transactional Stripe/Aida failures roll back
their transaction; a multi-migration run may have earlier commits. Retain logs and
truthful ledger state, then review a residual repair. Do not drop additive schema.

## 4. Guard deployment and old-invocation barrier — separate approval

Deploy only the approved #1016/main integration SHA after migration verification.
Keep checkout blocked and hold inactive. Verify Vercel project
`prj_RzOMts2AdqpKtbAgZ72GLKs55AJ2`, deployment READY/source, Production aliases and
the exact Stripe platform endpoint destination. Preserve connected-account and
WordPress endpoints. Verify every eligible hostname/immutable old URL is unable to
continue receiving relevant Stripe deliveries; changing an alias alone is not proof.

The recorded project setting is Fluid Compute/default 300s, not independently
verified per-deployment hard-runtime evidence. Obtain effective old/new deployment
function limits and any route overrides from provider metadata. Capture all old
invocation completion/expiry evidence through the last routed request. After every
old invocation is terminal, wait at least one verified maximum-runtime safety margin
(at least 300s if 300s is verified effective). Recheck no old traffic. Missing logs,
unknown duration or ambiguous old endpoints => STOP; do not infer completion from
receipt age, missing logs or fixed sleep alone.

No new Production synthetic payment is needed for this phase: use deployment/route
metadata, signed-delivery logs already present and an approved invalid-signature
request returning 400 without receipt mutation. A genuine event test is separately
authorized when its intended records and billing effects are explicit.

## 5. Hold, drain and live Stripe event coverage — separate approvals

After the old-invocation barrier, authorize this singleton update. Row locks conflict
with the atomic claim transaction; processing itself runs outside that transaction.
Use a reviewed revision value, not an unconditional overwrite:

```sql
BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='10s';
UPDATE platform_checkout_creation_gate
SET subscription_webhooks_held=true, revision=revision+1, changed_at=clock_timestamp()
WHERE id=1 AND blocked=true AND subscription_webhooks_held=false
  AND revision=:expected_revision
RETURNING id, blocked, subscription_webhooks_held, revision;
-- Require one returned row; otherwise ROLLBACK and investigate.
COMMIT;
```

Run `node --conditions=react-server --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/report-platform-subscription-webhook-drain.mjs` from the approved
guard-capable application with the verified target. Require activeProcessingCount=0
and no unresolved failed receipts. Legacy null-claimedAt post-handler receipts stay
visible but do not prove invocation termination. Any stale receipt needs termination
evidence and separately reviewed conditional recovery, not age-based deletion.
Recheck the gate revision and drain after coordinator deployment as well.

Live platform endpoint change requires exact endpoint ID/account/mode/URL approval:
retain existing Checkout/commerce selections; enable checkout.session.completed,
checkout.session.async_payment_succeeded, checkout.session.expired,
customer.subscription.created/updated/deleted and
invoice.paid/payment_failed/payment_action_required. Validate payload API version
against the selected parser. Preserve the signing secret and connected-account
scope; never rotate or reconnect as part of this plan. Confirm WordPress cannot
write DigitalGate canonical billing, or obtain its owner's explicit confirmation
and coordination before cutover. Do not alter the WordPress endpoint.

paused/resumed must be enabled only after the combined parser that normalizes them
to guarded subscription.updated is serving everywhere; older guard baseline ignores
them. If new subscription/invoice delivery causes unexpected non-platform effects,
STOP before release; retain events for reviewed retry instead of acknowledging them.

Planned hold <=30 minutes, alert at 15. If exceeded, retain hold and escalate; never
release into old projection to meet a timer. Confirm Stripe delivery retry horizon
and operator replay access before activation. Record all held/failed event IDs and
revisions privately without full payloads or credentials.

## 6. Coordinator and verified purchases — separate approvals

Deploy approved #1006 integration while retaining the atomic guard and closed gate.
All guard-bearing transitions require the same serving/old-invocation evidence;
do not reintroduce a pre-guard binary. Preserve saved customer progress and existing
canonical exemptions. Reconcile/expire previously issued sessions only under an
explicit session-specific approval; gate closure alone does not revoke old links.

From the final combined source, run a dry-run with securely injected live READ
credentials and allowlisted target. `STRIPE_SECRET_KEY` is read-only for this script;
no Stripe mutation API is invoked. Do not put secrets or approval private keys in
the app environment, reports or commands. Set DG_EXPECTED_PRODUCTION_STRIPE_ACCOUNT_ID,
DG_EXPECTED_PRODUCTION_DATABASE_HOST, DG_EXPECTED_PRODUCTION_DATABASE_NAME to the
independently verified target; DATABASE_URL must use sslmode=verify-full.

```sh
umask 077
node --conditions=react-server --experimental-strip-types \
  --import ./scripts/register-ts-resolver.mjs \
  scripts/reconcile-legacy-app-entitlements-production.mjs \
  --report="$PRIVATE_RELEASE_DIR/legacy-dry-run.json"
```

The invocation uses the same checked-in TypeScript resolver and react-server
conditions as the passed disposable tests. Use the pinned Node runtime. Review all
blocked/ambiguous/extra items and
provider ownership/status/currency/monthly quantity/Price-ID catalogue evidence.
Preserve six exemptions. A separate Ed25519 approver signs exact planSha256,
Stripe account, host/database, approver/ticket, approvedAt/expiresAt <=24h using
canonicalProductionApproval from the reviewed module. Never sign a placeholder.

```sh
node --conditions=react-server --experimental-strip-types \
  --import ./scripts/register-ts-resolver.mjs \
  scripts/reconcile-legacy-app-entitlements-production.mjs --apply \
  --approval="$PRIVATE_RELEASE_DIR/approval.json" \
  --report="$PRIVATE_RELEASE_DIR/legacy-apply.json"
```

Apply additionally requires DG_LEGACY_ENTITLEMENT_APPROVAL_PUBLIC_KEY. Signature and
fresh plan must match; compare-and-set/audit commit per row. Changed evidence,
expired approval or conflict => no force, retain partial evidence, fresh dry-run
and new signature. No new entitlement gates until every affected legitimate
purchase has a reviewed successful reconciliation or explicit safe disposition.

## 7. Entitlement rollout and retry release — separate approvals

Deploy approved #1015 integration SHA with canonical purchase projection/enforcement,
coordinator and guard all preserved. The local certification flag/nonce must NOT
exist in Production; normal pairing and actual Production endpoint checks apply.
Verify all serving routes, canonical six exemptions and legitimate legacy purchase
access before releasing held events. New Industry App arrays cannot authorize
access until verified; edited profile claims never suffice.

After all serving instances are verified, approve the same conditional singleton
UPDATE as activation with true -> false and a newly reviewed revision. Require one
row. Keep blocked=true. Observe automatic retries; manually replay exact unresolved
event IDs only under approved Stripe operation scope. Do not manufacture Production
signatures/events. Duplicate delivery must retain one receipt/effect. Run a fresh
post-deployment reconciliation dry-run; any additional writes need new review and
signature. Confirm live paused/resumed coverage only after the combined parser.

## 8. Exact Production acceptance and invitation gate — separate approvals

Before opening checkout: deployment/source/alias identity; database target/schema;
gate blocked and hold released; actual live Price IDs active and matching platform
AUD 99/249/499 monthly plus each selected add-on; 14-day trial; no stale accepted
custom offer; no unexpected receipt failures; all six exemptions unchanged.
No live Checkout session or charge is created merely to run these read-only checks.
Trial extensions/custom pricing are retained but not prerequisites for standard
activation. No optional lender/cleaning integration is a checkout blocker.

After owner approval to open and invite, conditionally update only blocked=false
at the reviewed revision (hold must be false); record operator/time/change ticket.
One invited customer first, observe, then the second. Use authenticated `/onboarding`
on the verified Production origin, retaining the existing organisation/membership.
Do not email a stale session or unauthenticated organisation-ID payment URL.

For AIM: preserve Growth/Finance selection and progress, show full current basket
(synthetic example 398 AUD/month), ensure historical 947/zero-day offer is not used.
For My Venue Clean: preserve Scale/Services/Growth Suite selection and progress,
show full basket (synthetic example 998 AUD/month), replace expired unpaid session
through coordinator only. Neither has a special offer or activated paid status.

For each real customer verify under authorized checkout: one owned session on repeat
POST, standard 14-day trial in actual subscription, exactly selected recurring
items, genuine signed webhook receipt processed once, canonical TRIALING/FULL with
matching customer/subscription/tenant and purchases, onboarding completion and
authenticated dashboard/purchased app page/API access. Unpurchased apps must remain
denied. Finance also requires app selection and beta enrollment. Never simulate
another customer identity or create synthetic live billing to test denial.
Abort opening if wrong pricing, trial, ownership, schema or receipt state appears.
Track first recurring paid invoice separately; starting a trial is not payment
collection and not yet the commercial success measure.

## Failure containment and rollback

At any discrepancy: close new checkout admission with a conditional revision update;
do not delete attempts or receipts. Inventory already issued sessions and admitted
expiry horizons; do not assume closure prevents their completion. Hold relevant
events only on verified guard-capable serving code with approved activation.
Before hold release, rollback only to a reviewed guard-capable revision, never an
old application ignoring the hold. Retain additive schema and verified purchases.
An application rollback is not permission to undo data or release inconsistent
projections. Failed rows/claims require explicit replay/recovery disposition.

Database recovery is a separate emergency approval: inspect a restored candidate,
account for post-snapshot writes and billing events, validate catalog/entitlements,
then approve all connection/compute/routing changes. Protected-root finalization is
not independently confirmed. Never switch to an old database while Stripe continues
mutating an uncoordinated state. Retain the original branch and audit artifacts.

## Approval request boundaries

1. Publish completion commits / resolve PR integration / accept required CI evidence.
2. Recovery freshness and exact residual migration write manifest, independently
   reviewed against the live ledger; candidate recovery access/downtime agreed.
3. Guard Production merge/deploy and read-only routing/execution verification.
4. Hold activation, live event-selection changes, coordinator deploy and exact
   signed reconciliation plan (each scope explicit, no blanket customer changes).
5. Entitlement deploy, hold release and exact retry/replay actions.
6. Production checkout opening and individual customer invitations/acceptance.

Until the applicable approval and verification pass, AIM and My Venue Clean are
NO-GO for live invitations. Local external-provider acceptance is complete; no
customer-specific billing development remains in this release preparation scope.
