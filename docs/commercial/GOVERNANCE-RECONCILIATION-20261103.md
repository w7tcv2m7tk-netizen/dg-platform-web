# Commercial governance safeguard evidence — 3 November 2026

Requirements: `platform.roadmap`, `detach.portal_billing`, `platform.auth`.
Approval: owner's 3 November assignment continuing **DigitalGate Production Hold
Review** (`6ae4aeaa-3020-83ec-af07-6eee4467961b`): strengthen existing AGENTS,
add read-only reconciliation, disclose discrepancies and publish an isolated PR.
This authorises safeguards/reporting, not commercial policy resolution or release.

Base: main `8d639743352b9e980afb7e156fc9ac9cff1308b2` fetched from GitHub.
Implementation tested: `617c53356b29f0c2be45bf7a552c9cd245ffdafe`.
Branch: `governance/commercial-reconciliation-20261103`.
PR and final documentation commit are recorded in the PR description.

## Sources inspected

`AGENTS.md`; `docs/ROADMAP.md` and catalogue/reconciliation under
`packages/platform-core/src/roadmap/`; `docs/commercial/PRICING-AND-PACKAGING.md`;
its linked `docs/foundations/COMMERCIAL-MODEL.md`; Industry lock in
`packages/platform-core/src/industry/platform.ts`; Business Brain seed, knowledge
foundation and `packages/platform-core/src/brain/approved-knowledge-context.ts`;
commercial catalogue, paid Apps, subscription types, purchased line items,
platform checkout, Stripe provisioning and entitlement resolver under
`packages/platform-core/src/billing/`; `src/lib/plans.ts`, pricing catalogue,
Gen2 onboarding model/wizard; `marketing/pages/pricing-page.html`; existing
pricing/marketing/Brain/Roadmap tests and checkout release workflow.

An older local checkout had obsolete $99 Industry/unlimited Scale/founding copy.
It was not used as authority: current fetched main resolves those differences.
The cached conversation is scope history, not evidence of current implementation.
Live Business Brain was not queried; seed default is **proposed**, not approved.
No production database/provider evidence was acquired or fabricated.

## Existing discrepancies (unchanged by this PR)

All three affect `detach.portal_billing` / `platform.auth` commercial launch.

1. **`public-card-starter`: Starter absent from public pricing cards.** The staff
   lock (`PRICING-AND-PACKAGING.md:16`) and commercial catalogue
   (`commercial-catalogue.ts:5`) define Starter $99. Public cards at
   `marketing/pages/pricing-page.html:1225` onward start at Growth $249, then Scale
   and Enterprise. The app pricing catalogue includes Starter. This is a missing
   public offering, not permission to retire Starter or invent a new price.
2. **`public-from-price`: public metadata advertises Core from $249.**
   `marketing/pages/pricing-page.html:4` differs from Starter $99 in the same
   staff lock and billing catalogue. Owner must confirm intended public scope and
   approve any copy correction separately.
3. **`bundle-lock`: staff lock lacks Growth Suite bundle definition.**
   `packages/platform-core/src/billing/paid-apps.ts:1`–2 implements $399 Suite and
   $499 Suite + Industry; public cards at `pricing-page.html:1340` and `:1354`
   offer those bundles. `docs/ROADMAP.md` records both in historical commercial
   closure, but the designated staff pricing lock contains no bundle definition.
   This is an authority/coverage gap, not proof the bundles are unapproved or that
   any price should change. Owner must reconcile scope/approval evidence and the
   staff lock before commercial consistency can be certified.

No conflicting source was silently selected or edited. Next action: owner review
of these findings, then a separately scoped reconciliation with approval evidence.

## Implementation and results

Existing `AGENTS.md` now mandates current-source checks before agent work,
summaries, commercial decisions and reports. It requires Roadmap IDs, approval
provenance, discrepancy reporting, revision/environment/test evidence and separate
approved / implemented / tested / verified / production-ready claims.

The dependency-free read-only runner imports only pure catalogue/selection
modules. It reads repository files, never credentials, Stripe clients or databases.
It compares catalogue/docs/public plan cards, onboarding, tier limits, Industry
and Growth pricing, templates, trial/annual rules and synthetic Stripe expectations.
Stripe rejection cases include wrong ID, amount, currency and interval. Source
contracts check configured-price validation and trial consumer wiring. These are
partial repository contracts, not exhaustive behavioural or live-provider proofs.

New PR workflow runs on every PR (including doc-only changes), with read-only
contents permission, pinned actions, no secrets, installation, migrations or
hosting/deployment steps. It runs detector self-tests then reconciliation. Expected
red reconciliation is intentional; there is no allowlist, continue-on-error or
baseline exemption for the three findings. Repository branch protection was not
changed; required-check enforcement is not claimed.

Local Node 24.4.1, 3 November 2026:

- `npm run test:commercial-contract-safeguard`: **11 passed, 0 failed/skipped**.
  Mutations are in memory only; a coherent synthetic fixture passes, and price,
  public card, trial, limit, Industry/Growth and Stripe-validation drift is caught.
- `npm run test:commercial-contract`: **53 checks, 3 findings, exit 1**;
  50 checks satisfied. Findings are the existing discrepancies above.
- `node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/test-pricing-entitlements.mjs`:
  passed all five existing assertion groups.
- `node --test scripts/test-marketing-commercial-consistency.mjs scripts/test-roadmap-certification.mjs`:
  **12 passed, 0 failed/skipped**.
- `node --test scripts/test-business-brain-knowledge.mjs`: **9 passed, 0 failed/skipped**.
- `npm run build`: **failed in prebuild**, after AI gateway policy **34/34** passed;
  `test-ai-gateway.mjs` cannot import missing `@prisma/client` in this isolated
  dependency-free checkout. Later prebuild checks, compile and route generation
  did not run. No database generation/migration or provider call was attempted.
- `git diff --check`: passed.

## Status and remaining blockers

Safeguard code **implemented and tested locally**, not independently verified.
Roadmap status **IMPLEMENTED BUT UNVERIFIED** for operational enforcement;
commercial reconciliation **BLOCKED** by the three findings. Not production-ready.
GitHub Actions results are pending publication and must be checked on the exact
PR head; the new reconciliation job should fail on the existing discrepancies.

Unverified: deployed public site; configured/live Stripe Price IDs, products,
active flags and subscriptions; live approved Brain coverage/supersession;
hosted onboarding; aggregate multi-business/seat enforcement and actual tenant
entitlements. The existing runtime/DB/provider gates remain necessary. No access,
provider, billing, price, permission, schema/migration or production changes are
included. Owner release HOLD and disabled Vercel Preview remain in force. This is
a governance review branch, not a release candidate; no merge/deploy is requested.

## Phase 2 reconciliation — 3 November 2026

Owner continuation of DigitalGate Production Hold Review authorised resolution of
the three findings on an isolated branch based on PR #1037 commit
`7815c59ab82b1de0991f39bb18bf864d057c5425`. Approval evidence was traced to the
current Roadmap commercial lock and historical implementation commit
`94dea226b47abf7695c2b0cdc19f87c7717a591a`, which introduced Growth Suite $399
and Growth Suite + Industry $499 checkout constants and behaviour.

Resolved without changing billing code, Stripe configuration, entitlements,
migrations or checkout state:

- restored the public Starter $99/month card and Starter in the Core tier summary;
- corrected public metadata from Core Platform from $249 to from $99;
- added the approved $399 and $499 bundle definitions and boundaries to the staff lock;
- expanded safeguard mutations so regression tests fail if any resolved contract drifts.

Local isolated verification on Node 24.4.1:

- Prisma Client 6.19.3 generated during `npm ci` in the isolated worktree;
- `npm run test:commercial-contract-safeguard`: **14 passed**;
- `npm run test:commercial-contract`: **53 checks, 0 findings**;
- pricing-entitlement assertions: **all five groups passed**;
- marketing/Roadmap/Business Brain regression suites: **21 passed**;
- complete `NODE_OPTIONS=--max-old-space-size=4096 npm run build`: **passed**,
  including prebuild, TypeScript and **457/457** static pages. The first default-heap
  attempt passed prebuild but stopped in Next.js compilation with local heap exhaustion.

This establishes local repository consistency only. The npm install reported 34
dependency audit findings (22 moderate, 11 high, 1 critical); no dependency upgrade
was made because it is outside this commercial-only scope. Live Stripe, deployed
website, hosted onboarding, live approved Brain coverage and aggregate tenant
entitlement behaviour remain unverified. Release HOLD and disabled Vercel Preview
remain unchanged. Exact-head hosted CI and independent review are still required.

Hosted run `41527159571` passed the read-only commercial reconciliation on exact
head `2a7c385cfe514b8e89b3f457b7864bb4785cae39`. Checkout run `41527159586`
then exposed a time-dependent Finance test fixture: the case labelled as a valid
trial hard-coded 1 November 2026 and therefore expired before the 3 November run.
No Finance runtime code failed or changed. The valid fixture now uses a stable
future boundary while the separate explicit expired-trial case remains unchanged;
local `npm run test:checkout-release` passes **389/389**. A new exact-head hosted
run is required. The attempted independent reviewer was unavailable because its
agent usage limit was exhausted; independent review is not claimed.

The corrected remote head `00f10c8eb9f36d4a28a0bd2fe87142b8639d6bfb`
subsequently passed hosted commercial reconciliation run `41561810025` and the
complete checkout release workflow run `41561810118`: dependency install, Prisma
generation, 389 release tests, disposable PostgreSQL reconciliation/concurrency,
TypeScript, full build, compatibility/client-boundary checks, generated-artifact
cleanliness and diff checks. This is hosted CI evidence, not Production or customer
journey certification.


## Codex targeted P2 remediation — 3 November 2026 (local, unpublished)

Approval: owner assignment to correct the three independently confirmed safeguard
defects, requirements `platform.roadmap`, `detach.portal_billing`, `platform.auth`.
Base `c137ad08e2938d190a016204a30e2c90f413ea34`; isolated branch
`fix/commercial-safeguards-20261103`. The received task text ends partway through
Defect C; its scope is the linked independent review's amount-comparison/comment
bypass and real checkout-builder rejection/trial verification. No additional
publication or Production authority is inferred.

Changes are confined to reconciliation, test harness/tests, its CI dependency
installation and existing evidence/Roadmap. No commercial constants, public
pricing, checkout runtime, Finance fixture, provider config or lockfile changed.

- Named, unique staff rows and public bundle cards must match canonical $399/$499
  constants, Core add-on boundaries and included/additional template rules.
- Unique description metadata must positively begin with the lowest approved Core
  starting amount; absent/incorrect/reworded metadata fails closed.
- `checkout-behaviour-contract.mjs` transpiles the real current checkout builder
  (or in-memory mutation) and runs it against an explicit dependency map. Stripe
  price retrieval, database reads and coordinator are synthetic stubs. Unexpected
  imports fail; real Stripe/Prisma clients and provider credentials are not loaded.
  For all three tiers, wrong amount/active/currency/interval/count must reject
  before reaching the coordinator; valid prices must reach it once with the
  canonical14-day trial, Core line and correct bundle/template line amounts.
  This validates the builder-to-coordinator contract, not live Stripe sessions,
  coordinator durability or webhook fulfilment. Existing regression suites cover
  those separate local boundaries.
- Literal source checks are supplementary; retaining their text in comments
  cannot make the new behavioural checks pass. This is not exhaustive program
  verification or resilience against an adversarial rewrite of the test harness.
- CI now installs the pinned lock using `npm ci --ignore-scripts` because the
  behavioural test uses existing TypeScript transpilation. No new dependency,
  lifecycle hook, migration, provider secret or deployment step is introduced.

Validation on Bens-Mac-mini.local, Node24.4.1, owned local worktree, minimal
subprocess environment without provider credentials; existing exact-lock installed
dependencies reused from the independent review worktree:

- reconciliation:57 checks, zero findings;
- safeguard mutations:32/32, including $499→$498 with unrelated Scale$499 intact,
  $99→$100/$249, missing/reworded metadata, missing bundle/Core/template terms,
  commented disabled validation/trial, removed Core line and wrong bundle amount;
- checkout389/389; pricing five assertion groups; marketing/Roadmap/Brain21/21;
- compatibility171/171 (mocked, not disposable PostgreSQL rerun);
- TypeScript, changed-code lint and `git diff --check`:PASS.

Live approved Brain coverage remains unavailable/unverified; proposed repository
seeds are not approvals. No credentials accessed, provider calls, Production SQL,
migrations, Stripe changes, checkout activation, commit, push or deployment.
Hosted CI on the changed diff and final independent acceptance remain pending.
Logs: `/private/tmp/dg-commercial-remediation-evidence`.

Final full `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=4096 npm run build`
completed successfully, including prebuild, TypeScript and457/457 pages. Existing
module-type/Cache-Control/middleware warnings and compilation warnings involving
symlinked Next dependency paths were emitted; none failed the build. Final
governance regression rerun passed21/21 after documentation changes.


## Final two P2 corrections — 3 November 2026 (local, uncommitted)

Owner-authorised scope: fix the independent acceptance's HTML-comment and
unexpected-exception false positives only. Same six-file inventory and exact
base `c137ad08e2938d190a016204a30e2c90f413ea34`; no new dependency. Prior
32-test/coordinator-only evidence above is historical, superseded by these checks.

- HTML comments are removed before all public metadata/card extraction, including
  unterminated comments (fail closed). Active markup remains valid; conflicting
  duplicate description, named bundle or bundle-price elements fail. No broad
  application HTML/parser or runtime change.
- Fake Stripe `checkout.sessions.create` now records every attempt. Invalid prices
  require the intended validation Error and exact message, zero coordinator calls
  and zero provider-create calls. TypeError and unrelated Error fail verification.
- Valid builder requests pass through the synthetic coordinator to the fake Stripe
  create spy exactly once, with the same request, subscription mode, correct Core
  price, bundle/template line amounts and canonical14-day trial. The actual
  platform-checkout.ts is transpiled/executed, not a parallel checkout algorithm.
  Coordinator durability, real Stripe delivery and live subscription lifecycle are
  intentionally not claimed. No real Stripe client or database is imported.

One controlled verification pass, minimal test environment without provider secrets:

- reconciliation57 checks / zero findings; safeguards44/44;
- direct real-builder acceptance test1/1 exercising24 scenarios across3 tiers
  (5 invalid prices +3 valid baskets per tier);
- checkout389/389; compatibility171/171; governance21/21;
- pricing/entitlement five assertion groups; TypeScript; changed-code lint;
  `git diff --check`:PASS.

All five independent counterexample families are rejected: named499→498 despite
unrelated Scale499; advertised99→100/249 or missing metadata; commented-out amount
validation; commented metadata/bundle elements; and provider-create attempts before
rejection. Additional tests reject unexpected exceptions, conflicting duplicates
and missing template/Core terms. Existing32 safeguards remain green.

No runtime checkout, commercial constants, pricing markup, entitlement policy,
Finance fixture, migration, lockfile or provider config change. Production HOLD.
Live approved Brain remains unavailable/unverified; proposed seeds are not approval.
No commit/push/publication or final independent certification performed. Next gate:
fresh independent acceptance of this exact local snapshot.

Logs and immutable snapshot inventory: `/private/tmp/dg-final-two-p2-evidence`.
File hashes below cover the five other candidate files; this evidence file's own
hash is in external snapshot.json to avoid a self-referential hash.

Full `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=4096 npm run build`: **PASS**, including complete prebuild, TypeScript and457/457 pages. Existing module-type, middleware, Cache-Control and symlinked Next dependency compilation warnings remain non-fatal.

Final file SHA-256 fingerprints:

- `.github/workflows/commercial-contract.yml`: `38a27a688c9f7677319611c9a3c684b1a092d8da482d14086f4edce00d8b13ad`
- `docs/ROADMAP.md`: `7381939a2341da692a89a13621bd09a99b99f26b5382efdcd8f67ff2ce0317a8`
- `scripts/checkout-behaviour-contract.mjs`: `9d54c58804a48978a2dea4f08a21130a089f313f68f609289b0a2c870df46a35`
- `scripts/commercial-contract.mjs`: `d4614ed0f2c7dbfd6d9cf80074c22347b515572b14bb122040a8c0dd9f630446`
- `scripts/test-commercial-contract.mjs`: `4ca52897699b623b7babc4b04a9ab0ed2458421af1240afa81c651e7c64dda9e`
