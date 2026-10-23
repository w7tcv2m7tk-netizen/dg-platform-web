# AIM Financial and My Venue Clean — controlled checkout recovery

Requirements: `platform.auth`, `detach.portal_billing`, `crm.companies`.
Owner policy: both are prospective Founding 10 customers using the public catalogue,
standard onboarding and a 14-day trial. Historical proposals are not accepted contracts.
This 21 October 2026 continuation supersedes the previous customer-offer assessment in
this file. It authorises no Production or provider operation.

## Completed external-provider acceptance — 21 October 2026

This result supersedes the acceptance-gap and prior-build statements below, which
remain as dated investigation history. Both synthetic customer journeys passed at
2026-10-21 01:54:45 UTC on b1d08a0d plus the current uncommitted delta.
Evidence: `Verification/Checkout-Certification-20261018/local-provider-20261021/`
(report, redacted listener log, runner and SHA-256 hashes).

- Mortgage: Growth AUD 249 + Finance AUD 149 = AUD 398/month.
- Cleaning: Scale AUD 499 + Growth Suite/Services AUD 499 = AUD 998/month.
- These synthetic saved selections are not customer agreements. Customers must see
  the full catalogue total and may change their selections normally.
- Genuine Clerk Development login resumed saved synthetic organisation progress.
- Actual hosted Stripe test Checkout completed; both subscriptions had exactly
  14-day trials. Actual signed events reached the temporary local CLI listener.
- Canonical records became TRIALING/FULL with Finance, or Services + Growth Suite.
- Onboarding completed; purchased app activation, page/API and authenticated
  dashboard returned 200. Unpurchased app activation returned 403.
- Duplicate session creation reused the owned session. Cleaning expiry was delivered
  through a real signed event and replacement preserved onboarding progress.
- Invalid signature returned 400. Separate replay testing used actual event payloads
  re-signed with the temporary listener secret: hold returned 503; release returned
  200 with unchanged receipt claim. This is distinct from network Stripe delivery.
- Customer assertions: 22/22 passed. Local certification/pairing tests: 67/67 passed.
- Fresh canonical `npm run build` (all lifecycle hooks): exit 0, 78 seconds,
  2026-10-21 02:10:29–02:11:47 UTC; Next.js 16.2.12 Webpack, TypeScript and
  456/456 page generation passed. Existing middleware/cache-header and dynamic
  server-rendering diagnostics were non-fatal. No source or lockfile change was
  needed to build. Fresh standalone TypeScript and whitespace validation passed.
- Both test subscriptions were verified canceled afterward. Synthetic Clerk users
  were deleted, the owned database removed, and listener/application stopped.

The exception requires explicit development-only authorisation, test credentials,
non-Vercel/non-CI execution, the same random disposable loopback database for both
URLs, bounded driver parameters and a server-observed ownership nonce. Localhost
is never classified as Neon. Instrumentation verifies database, address, port and
nonce before serving, using the existing pool with transaction/statement deadlines.
Normal Production/Preview pairing is unchanged; the endpoint allowlist is unchanged.

The unavailable hosted alias (404) and quota-exhausted Neon project (402) were safely
bypassed without hosted changes. The existing-membership journey requires no Clerk
user-created webhook secret. New-user provisioning and hosted routing are not newly
certified here. Harness origin normalization, visible Card selection and optional
Link enrollment were resolved without application business-rule changes or bypasses.
The local browser acceptance used development Webpack; canonical build validation
uses the repository's existing production command, not a new bundler configuration.

No Production release, customer invitation or first collected recurring payment is
certified by these trial tests. Both customers remain NO-GO for live invitations
until the dependency-ordered Production steps below receive approval and pass.
GO for independent review of the local delta and release preparation.

## Preserved candidates and local changes

- #1006: `27a2ae80a785febea592f2b41926b626821a1c24` — checkout coordinator.
- #1016: `d5c9f30a6e1fa010939b1f155abe309becdd6fe6` — independent atomic webhook guard.
- #1015: `b1d08a0de540648a65c194d0b54dddb75296c1d8` — contains the #1006 and
  #1016 implementations plus canonical purchase projection/enforcement and Finance.
  Its base is #1006, not main. It is the combined application acceptance target.
- Recovery package: `af85b034f854c8e9ff9a66890a9607f85503cca3`, separate from guard PR.

The intact checkout worktree is
`/Users/okcomputers/Developer/DigitalGate/Worktrees/dg-backlog-entitlements`, branch
`finish/checkout-entitlements`. The old `/private/tmp/dg-pr1006-reconcile-20261016`
folder is Gitless; it was not repaired, overwritten or removed. The primary main
worktree's unrelated uncommitted onboarding work was not touched. No commits,
pushes, PR edits, merges, provider settings or Production records were changed here.

The candidate already implements the confirmed runtime corrections:

- Legacy `billing.commercialOffer` settings cannot establish acceptance. An exact
  current offer requires an organisation-bound customer token claim; Founding 10
  follows the public catalogue. Historical records are retained. Custom checkout
  and webhook validation remain available for genuinely accepted exceptional offers.
- Starter/Growth/Scale platform prices are AUD 99/249/499 monthly, with 1/5/20 users
  and the normal 14-day trial. Industry Apps, premium apps and optional support
  are additional catalogue selections, not silently included in the platform price.
- Configured monthly Stripe Price IDs are retrieved and validated for active state,
  amount, AUD currency and one-month recurrence; mismatches fail before session
  creation. Without an ID, the existing catalogue-derived inline price path remains.
- The organisation-scoped coordinator retains immutable request/idempotency scope,
  reuses an owned open session, verifies legacy sessions before replacement, and
  fails closed on uncertain outcomes. Checkout creation does not activate access.
- Verified webhook purchase projection, canonical subscription/exemption precedence,
  entitlement gates, grace-period handling and app-deactivation checks are retained.
- Existing operator custom-pricing and trial-management capabilities are not changed
  by this continuation. No new trial-extension capability is claimed as certified.

## Customer state and acceptance evidence

Prior read-only Production evidence located both existing onboarding records.
Neither had a canonical platform subscription or recorded platform webhook receipt.
This continuation used synthetic records only and did not refresh customer data.

AIM's saved selection is Growth, monthly, Finance/mortgage and Standard support.
Its historical AUD 947/zero-day proposal is not an accepted contract and must never
be used as the standard checkout offer. No valid saved session was established.
My Venue Clean's saved selection is Scale, monthly, Services/cleaning, Growth Suite
and Standard support. Its saved live session was expired/unpaid. Its prior line
items were AUD 499 platform plus AUD 499 Growth Suite/Services monthly; those are
saved selections, not a customer acceptance. Show the current complete catalogue
summary and allow normal selection changes before starting checkout.

New disposable PostgreSQL regressions execute the actual offer resolver and checkout
creator/coordinator for synthetic equivalents of both saved progress shapes. They
verify stale-offer rejection, the platform price and 14-day trial, expired legacy
session handling, reuse of a single owned open session, unchanged saved progress and
historical settings, and no premature subscription/customer activation. They do not
claim authenticated browser, actual Stripe Checkout or external webhook delivery.

Fresh validation on `b1d08a0d` plus the local test/documentation delta:

- Checkout/lifecycle PostgreSQL: 126/126 (including two new resume scenarios).
- Legacy reconciliation PostgreSQL: 27/27.
- Atomic guard PostgreSQL: 6/6.
- Explicit accepted-offer/Founding 10 neutrality regression: passed.
- TypeScript `tsc --noEmit --incremental false`: passed.
- `git diff --check`: passed.
- Disposable cluster stopped and destroyed. Provider calls mocked; no live objects.
- Reused full `npm run build` evidence on unchanged application source at `b1d08a0d`:
  `Verification/Backlog/20261021/dg-backlog-entitlements-full-build.log` and its
  SHA-256 in the existing evidence manifest. This is a prior successful build,
  not a newly executed build. No package/lockfile/application change invalidates it.
- Fresh database log: `/private/tmp/dg-urgent-checkout-db-20261021.log`.

## Historical test-service preflight — superseded by completed acceptance above

Read-only API checks using existing securely stored test credentials succeeded:
Stripe balance reported test mode; Clerk Development instance lookup returned 200.
The Stripe sandbox now has one enabled endpoint at
`dg-checkout-verification-preview-20261012.vercel.app/api/webhooks/stripe`, with
Checkout completion/async success/expiry, payment-intent failure, invoice paid/
failure/action-required and subscription created/updated/deleted enabled. This
supersedes older evidence that the sandbox endpoint inventory was empty.

The destination is not a Production hostname. However Vercel deployment lookup in
the authorised DigitalGate team returned 404/not-found. That does not prove deletion
or isolation: its serving revision, credentials, database target and ownership remain
unverified. The current local credentials file has no Clerk webhook signing secret.
Do not send synthetic purchases into this unverified endpoint. Existing test keys
alone do not establish an isolated, authenticated customer journey.

No new Neon Preview resources are needed. Use disposable localhost PostgreSQL with
synthetic tenants plus existing Clerk Development/Stripe sandbox, and an approved
reachable test origin. Before external test events, verify that the sandbox webhook
and signing secret reach that exact isolated application/database; verify Clerk
login/session routing and whether Clerk webhook provisioning is required. If it is,
supply its matching development signing secret. Owner approval is required for any
provider routing/settings change or deployment; none was made here.

The missing acceptance run is one authenticated standard journey at the combined
candidate: pricing and saved progress -> catalogue summary -> actual test Checkout
-> 14-day trial -> signed webhook -> canonical subscription and purchased apps ->
onboarding completion -> authenticated dashboard. Include duplicate/retry recovery,
unpurchased-app denial, Finance beta enrolment and Services access. Preserve the
existing tenant; do not provision a second organisation to resume. An authenticated
`/onboarding` continuation is the safe entry; only its authorised POST obtains the
short-lived Stripe URL. Do not distribute an expired session URL or implement an
unauthenticated organisation-ID payment link.

## One dependency-ordered release plan — approvals required

1. Independent review of this focused delta and the combined #1015 candidate.
   Reconcile #1006/#1016 with the exact approved main revision locally before
   publication; current GitHub metadata reports conflicts for those PRs. Revalidate
   only affected integration code. No automatic merge or broad main-worktree edits.
2. Review the now-completed external sandbox/authenticated acceptance evidence before opening
   live checkout. Obtain approval for the exact test endpoint/origin configuration
   if the existing destination cannot be verified. Do not create Neon previews.
3. Fresh Production read-only preflight/recovery verification, then separately
   approved execution of the frozen recovery manifest from its complete 24-directory
   migration tree: initial historical baseline; transactional Stripe reconciliation;
   Knowledge baseline; guarded Aida repair and baseline; AI Visibility baseline;
   six canonical deploy migrations (Prospect snapshot, checkout attempt, creation
   gate, app-entitlement columns, webhook hold, Aida alignment). Repeat catalog,
   ledger/checksum, six-exemption and blocked-gate/inactive-hold assertions. Never
   use unrestricted migrate deploy from a different migration tree or fabricate
   applied history. Recheck current ledger/catalog; old counts are dated evidence.
4. Separately approve #1016 merge/deployment with checkout closed and hold false.
   Verify every alias/immutable route and Stripe endpoint, effective old/new runtime
   limits, old invocation termination plus the documented safety margin. A receipt
   drain alone cannot prove old invocation termination. Approve hold activation only
   after these prerequisites; then require zero unresolved in-flight handlers.
5. Under the verified guard/hold, separately approve the exact live platform Stripe
   endpoint event changes: subscription created/updated/deleted and
   invoice paid/payment_failed/payment_action_required, retaining existing Checkout
   and commerce events. Confirm the webhook API payload version matches the parser.
   The older sandbox endpoint omits paused/resumed; add them only after the
   deployed parser demonstrably normalizes and guards them (the combined candidate
   does; the guard-only baseline ignores them). Include them in the approved test
   routing as well. Preserve WordPress/connected-account routes; resolve any
   competing writer/legacy session delivery before cutover.
6. Deploy #1006's coordinator before #1015 enforcement, preserving guard behavior
   and closed creation gate. Under the hold, inventory legacy billing and purchases,
   review a new dry-run, obtain separate signed approval and apply only that plan.
   Preserve six canonical exemptions; profile arrays are not purchase evidence.
   Do not activate new entitlement gates before reconciliation succeeds.
7. Separately approve #1015 merge/deployment. Verify canonical projection and access
   on all serving instances, then separately authorise hold release. Observe Stripe
   retries/replays and idempotent completion; run the required new post-deployment
   reconciliation dry-run. New writes require new signed approval.
8. After release acceptance, obtain explicit checkout-opening and invitation approval.
   Resume each customer's existing onboarding and review the complete selected
   charges; create/resume one authorised session per organisation. Verify trial,
   canonical subscription, selected/beta apps and dashboard access before declaring
   activation. A trial is not a collected first recurring payment.

Rollback retains additive schema, attempts, receipt history and canonical purchases.
Once hold is active, never restore an application that ignores it. Return to a
verified guard-capable build with checkout closed and hold active if cutover fails;
provider replay and signed recovery are explicit operations. Database restore can
lose post-snapshot writes and has its own protected-branch approval/verification
requirements. The frozen recovery package remains unchanged.

## Decision

AIM Financial: NO-GO for a live Checkout invitation today. The candidate fixes its
standard-offer path locally; required release and authenticated acceptance are not
complete. Finance requires verified purchase, selected app state and beta enrolment.
My Venue Clean: NO-GO for a live invitation today for the shared operational reasons;
the expired Checkout is not reusable, but saved progress can be preserved locally.
Services needs its purchased and selected app entitlement. Optional lender/credit,
cleaning integrations and operator trial extensions do not block standard subscription
activation unless a specific required workflow demonstrates that dependency.

GO for independent review of the local completion delta. HOLD for Production release,
checkout reopening and customer invitations. No customer-specific billing code is needed.


## 21 October 2026 — real AIM checkout failure, release blocker confirmed

Owner reports a real AIM Financial subscription attempt returned “Subscription
checkout is temporarily unavailable. Please try again shortly.” Billing & Plan
showed organisation status Trial, no platform tier and no Stripe customer.
At 15:25 Brisbane, explicitly scoped Production SELECT confirmed the creation-gate
and checkout-attempt tables remain absent, 15 migrations finished and initial
baseline ledger entry absent. Production alias/source remain dpl_GPeE5mZ7n5jjmTce3THEqiKYeG2T /
7a10486d00c83adfb8744e4de86c5d9f21ed4ad0. Source inspection confirms missing
gate admission throws this exact sanitised error before Stripe session creation.
This establishes the expected fail-closed blocker; it does not independently
exclude every other possible runtime issue or attest unobserved customer access.
No customer records, progress, identity or Stripe objects were changed.

Standard candidate acceptance remains Growth 249 + Finance 149 = AUD 398/month
with 14-day trial, preserving authenticated onboarding resumption. The existing
Production path is not newly certified for that basket. Before real payment,
verify its complete summary and actual Stripe items/trial after approved release.
No manual Payment Link or customer-specific offer workaround is permitted.

Immediate release step: securely inject the verified direct Production URL in an
approved operator-side execution environment and perform only the already-approved
20260805_legacy_schema_baseline resolution, then verify 16 finished rows and original
15 unchanged. Previous tool method was automatically rejected for credential
embedding and was not executed; no retry through that method is authorised.
Subsequent Stripe DDL/baselines/Aida/five migrations, guard/coordinator/entitlement
deploys, hold/reconciliation/event changes and checkout opening require their own
applicable approval. Keep old-invocation/session drain and rollback safeguards.

Separate UX follow-up (detach.portal_billing / platform.auth): distinguish an
organisation's pre-checkout Trial label from a verified subscription trial. Do not
label this as an access bypass without evidence; no such bypass was established
in this focused incident check. Fix wording separately unless actual access proves
it security-critical. Preserve Nathan's existing organisation/onboarding throughout.
