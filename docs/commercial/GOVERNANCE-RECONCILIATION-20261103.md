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
